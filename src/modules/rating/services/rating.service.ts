import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { RatingRepository } from '../repositories/rating.repository';
import { CreateRatingDto, RatingQueryDto, IUserRatingStats } from '../dto/rating.dto';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { OrderRepository } from 'src/modules/order/repositories/order.repository';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { BuyerRepository } from 'src/modules/buyer/repositories/buyer.repository';
import { SellerRepository } from 'src/modules/seller/repositories/seller.repository';
import { TransporterRepository } from 'src/modules/transporter/repositories/transporter.repository';

@Injectable()
export class RatingService {
    constructor(
        private ratingRepository: RatingRepository,
        private orderRepository: OrderRepository,
        private userRepository: UserRepository,
        private buyerRepository: BuyerRepository,
        private sellerRepository: SellerRepository,
        private transporterRepository: TransporterRepository,
    ) { }

    async createRating(body: CreateRatingDto, user: IJwtPayload) {
        const { rating, review, orderId, orderType } = body;

        // Validate that either truckOrderId or orderId is provided (but not both)
        if (!orderId) {
            throw new BadRequestException(
                'Please provide orderId',
            );
        }

        // Check if user has already rated for this order
        const existingRating = await this.ratingRepository.findExistingRating(
            user.id,
            orderId,
        );

        if (existingRating) {
            throw new BadRequestException(
                'You have already rated for this order',
            );
        }

        // Get the user to be rated based on the order
        const ratedUserId = await this.getRatedUserFromOrder(user.id, orderId);

        // Create the rating
        const ratingData = {
            raterId: user.id,
            ratedUserId,
            rating,
            review: review || null,
            orderId,
            orderType,
        };

        try {
            const newRating = await this.ratingRepository.create(ratingData);

            // Update user's average rating
            await this.updateUserAverageRating(ratedUserId);

            // Update the isRated flag on the corresponding order or truck order
            if (orderId) {
                await this.orderRepository.updateOrder(orderId, { isRated: true, type: orderType });
            }

            return newRating;
        } catch (error) {
            // Handle duplicate key error
            if (error.code === 11000) {
                throw new BadRequestException('You have already rated this order');
            }
            throw error;
        }
    }

    private async updateUserAverageRating(userId: string) {
        console.log('Updating average rating for userId:', userId);
        const averageRating = await this.ratingRepository.calculateAverageRating(userId);
        console.log('Calculated average rating:', averageRating);

        const roundedAverage = Math.round(averageRating * 100) / 100;
        console.log('Rounded average rating:', roundedAverage);

        await this.userRepository.update(userId, {
            averageRating: roundedAverage
        } as any);

        console.log('Updated user average rating successfully');
    }

    async getUserRatings(query: RatingQueryDto) {
        const { page = '1', limit = '10', userId, orderType } = query;

        if (!userId) {
            throw new BadRequestException('User ID is required');
        }

        // Verify that the user exists
        const user = await this.userRepository.findOne(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        let offset = 0;
        const limitNum = parseInt(limit);
        if (parseInt(page) > 0) {
            offset = (parseInt(page) - 1) * limitNum;
        }

        const filter: any = { ratedUserId: userId };
        if (orderType) {
            filter.orderType = orderType;
        }

        const [ratings, total, stats] = await Promise.all([
            this.ratingRepository.findAll(filter, offset, limitNum),
            this.ratingRepository.getTotal(filter),
            this.getUserRatingStats(userId),
        ]);

        return {
            ratings,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limitNum),
            stats,
        };
    }

    async getUserRatingStats(userId: string): Promise<IUserRatingStats> {
        // Verify that the user exists
        const user = await this.userRepository.findOne(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        console.log('Getting rating stats for userId:', userId);

        const [stats, recentReviews] = await Promise.all([
            this.ratingRepository.getUserRatingStats(userId),
            this.ratingRepository.findAll({ ratedUserId: userId }, 0, 5), // Get 5 most recent reviews
        ]);

        console.log('Raw stats from repository:', stats);
        console.log('Recent reviews count:', recentReviews.length);

        // Process rating breakdown
        const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        if (stats.ratingBreakdown && Array.isArray(stats.ratingBreakdown)) {
            stats.ratingBreakdown.forEach((rating: number) => {
                ratingBreakdown[rating] = (ratingBreakdown[rating] || 0) + 1;
            });
        }

        const result = {
            userId,
            averageRating: Math.round((stats.averageRating || 0) * 100) / 100,
            totalRatings: stats.totalRatings || 0,
            ratingBreakdown,
            recentReviews: recentReviews.map((review: any) => ({
                _id: review._id.toString(),
                raterId: {
                    _id: review.raterId._id.toString(),
                    firstName: review.raterId.firstName,
                    lastName: review.raterId.lastName,
                    email: review.raterId.email,
                },
                ratedUserId: review.ratedUserId.toString(),
                rating: review.rating,
                review: review.review,
                orderType: review.orderType,
                truckOrderId: review.truckOrderId?.toString(),
                orderId: review.orderId?.toString(),
                createdAt: review.createdAt,
                updatedAt: review.updatedAt,
            })),
        };

        console.log('Final rating stats result:', result);
        return result;
    }

    async getMyRatingsGiven(user: IJwtPayload, query: RatingQueryDto) {
        const { page = '1', limit = '10', orderType } = query;

        let offset = 0;
        const limitNum = parseInt(limit);
        if (parseInt(page) > 0) {
            offset = (parseInt(page) - 1) * limitNum;
        }

        const filter: any = { raterId: user.id };
        if (orderType) {
            filter.orderType = orderType;
        }

        const [ratings, total] = await Promise.all([
            this.ratingRepository.findAll(filter, offset, limitNum),
            this.ratingRepository.getTotal(filter),
        ]);

        return {
            ratings,
            total,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limitNum),
        };
    }

    async deleteRating(ratingId: string, user: IJwtPayload) {
        const rating = await this.ratingRepository.findOne(ratingId);
        if (!rating) {
            throw new NotFoundException('Rating not found');
        }

        // Only the rater can delete their own rating
        if (rating.raterId._id.toString() !== user.id) {
            throw new ForbiddenException('You can only delete your own ratings');
        }

        await this.ratingRepository.delete(ratingId);

        // Update the rated user's average rating
        await this.updateUserAverageRating(rating.ratedUserId.toString());

        return { message: 'Rating deleted successfully' };
    }

   private async getRatedUserFromOrder(
    raterId: string,
    orderId: string,
): Promise<any> {

    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
        throw new NotFoundException('Order not found');
    }

    // Check if the order is completed
    if (order.status !== 'completed') {
        throw new BadRequestException('You can only rate after the order is completed');
    }

    // Extract user IDs from the populated order data
    let buyerUserId: string;
    let profileUserId: string;

    // Handle buyerId (same as before)
    if (typeof order.buyerId === 'object' && (order.buyerId as any).userId) {
        // buyerId is populated, check if userId is also populated
        if (typeof (order.buyerId as any).userId === 'object') {
            buyerUserId = (order.buyerId as any).userId._id.toString();
        } else {
            buyerUserId = (order.buyerId as any).userId.toString();
        }
    } else {
        // buyerId is just an ObjectId, need to fetch buyer
        const buyer = await this.buyerRepository.findOne(order.buyerId.toString());
        if (!buyer) {
            throw new NotFoundException('Buyer not found');
        }
        buyerUserId = buyer.userId.toString();
    }

    // Handle profileId based on profileType
    if (typeof order.profileId === 'object' && (order.profileId as any).userId) {
        // profileId is populated
        if (typeof (order.profileId as any).userId === 'object') {
            profileUserId = (order.profileId as any).userId._id.toString();
        } else {
            profileUserId = (order.profileId as any).userId.toString();
        }
    } else {
        // profileId is just an ObjectId, need to fetch based on profileType
        let profile;
        if (order.profileType === 'transporter') {
            profile = await this.transporterRepository.findOne(order.profileId.toString());
        } else if (order.profileType === 'seller') {
            profile = await this.sellerRepository.findOne(order.profileId.toString());
        }
        
        if (!profile) {
            throw new NotFoundException(`${order.profileType} not found`);
        }
        profileUserId = profile.userId.toString();
    }

    // Determine who should be rated based on who is rating
    if (raterId === buyerUserId) {
        // Buyer is rating the seller/transporter
        return profileUserId;
    } else if (raterId === profileUserId) {
        // Seller/transporter is rating the buyer
        return buyerUserId;
    } else {
        throw new ForbiddenException('You are not part of this order');
    }
}

    /**
     * Admin method to recalculate all user average ratings
     * @param user - JWT payload (must have admin role)
     */
    async recalculateAllUserAverages(user: IJwtPayload) {
        if (user.role !== 'admin') {
            throw new ForbiddenException('Only admins can recalculate all user averages');
        }

        // Get all users who have received ratings
        const usersWithRatings = await this.ratingRepository.findDistinctRatedUsers();

        let updated = 0;
        for (const userId of usersWithRatings) {
            try {
                await this.updateUserAverageRating(userId);
                updated++;
            } catch (error) {
                console.error(`Failed to update average rating for user ${userId}:`, error);
            }
        }

        return {
            message: `Successfully recalculated average ratings for ${updated} users`,
            totalUsersUpdated: updated,
        };
    }

    // private async getRatedUserFromTruckOrder(raterId: string, truckOrderId: string): Promise<string> {
    //     const truckOrder = await this.truckOrderRepository.findOne(truckOrderId);
    //     if (!truckOrder) {
    //         throw new NotFoundException('Truck order not found');
    //     }

    //     // Check if the order is completed
    //     if (truckOrder.status !== 'completed') {
    //         throw new BadRequestException('You can only rate after the order is completed');
    //     }
    //     console.log(truckOrder.profileType, truckOrder.profileId._id.toString(), truckOrder.buyerId._id.toString());
    //     // Get buyer and profile information
    //     const [buyer, profile] = await Promise.all([
    //         this.buyerRepository.findOne(truckOrder.buyerId._id.toString()),
    //         truckOrder.profileType === 'transporter'
    //             ? this.transporterRepository.findOne(truckOrder.profileId._id.toString())
    //             : this.sellerRepository.findOne(truckOrder.profileId._id.toString()),
    //     ]);
    //     console.log(buyer, profile);
    //     if (!buyer || !profile) {
    //         throw new NotFoundException('Order participants not found');
    //     }

    //     const buyerUserId = buyer.userId.toString();
    //     const profileUserId = profile.userId.toString();

    //     // Determine who should be rated based on who is rating
    //     if (raterId === buyerUserId) {
    //         // Buyer is rating the truck owner/transporter
    //         return profileUserId;
    //     } else if (raterId === profileUserId) {
    //         // Truck owner/transporter is rating the buyer
    //         return buyerUserId;
    //     } else {
    //         throw new ForbiddenException('You are not part of this truck order');
    //     }
    // }


    /**
     * Manual method to recalculate a specific user's average rating
     * Useful for debugging and fixing inconsistencies
     */
    async recalculateUserAverage(userId: string, adminUser: IJwtPayload) {
        if (adminUser.role !== 'admin') {
            throw new ForbiddenException('Only admins can manually recalculate user averages');
        }

        console.log('Manually recalculating average for userId:', userId);

        // Verify user exists
        const user = await this.userRepository.findOne(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Get all ratings for this user
        const allRatings = await this.ratingRepository.findAll({ ratedUserId: userId }, 0, 1000);
        console.log('Found ratings:', allRatings.length);

        // Calculate average manually
        let totalRating = 0;
        let count = 0;
        allRatings.forEach(rating => {
            totalRating += rating.rating;
            count++;
            console.log(`Rating ${count}: ${rating.rating}, Running total: ${totalRating}`);
        });

        const manualAverage = count > 0 ? totalRating / count : 0;
        console.log('Manual average calculation:', manualAverage);

        // Update using repository method
        await this.updateUserAverageRating(userId);

        // Get fresh stats
        const stats = await this.getUserRatingStats(userId);

        return {
            userId,
            manualCalculation: {
                totalRatings: count,
                totalScore: totalRating,
                averageRating: Math.round(manualAverage * 100) / 100
            },
            repositoryStats: stats,
            userRecord: user
        };
    }
}
