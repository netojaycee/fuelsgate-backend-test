import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rating, RatingDocument } from '../entities/rating.entity';

@Injectable()
export class RatingRepository {
    constructor(
        @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    ) { }

    async create(ratingData: any): Promise<Rating> {
        const rating = new this.ratingModel(ratingData);
        return rating.save();
    }

    async findOne(id: string): Promise<Rating | null> {
        return this.ratingModel.findById(id).populate('raterId', 'firstName lastName email').exec();
    }

    async findAll(filter: any, offset: number, limit: number): Promise<Rating[]> {
        // Update filter to handle both string and ObjectId for ratedUserId
        if (filter.ratedUserId) {
            const ratedUserId = filter.ratedUserId;
            delete filter.ratedUserId;
            filter.$or = [
                { ratedUserId: ratedUserId },
                { ratedUserId: new Types.ObjectId(ratedUserId) }
            ];
        }

        return this.ratingModel
            .find({ ...filter, isDeleted: false })
            .populate('raterId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .exec();
    }

    async getTotal(filter: any): Promise<number> {
        // Update filter to handle both string and ObjectId for ratedUserId
        if (filter.ratedUserId) {
            const ratedUserId = filter.ratedUserId;
            delete filter.ratedUserId;
            filter.$or = [
                { ratedUserId: ratedUserId },
                { ratedUserId: new Types.ObjectId(ratedUserId) }
            ];
        }

        return this.ratingModel.countDocuments({ ...filter, isDeleted: false }).exec();
    }

    async findByUserId(userId: string, offset: number, limit: number): Promise<Rating[]> {
        return this.ratingModel
            .find({ ratedUserId: userId, isDeleted: false })
            .populate('raterId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .exec();
    }

    async getUserRatingStats(userId: string): Promise<any> {
        // Try both string and ObjectId matching since the field might be stored as either
        const pipeline = [
            {
                $match: {
                    $or: [
                        { ratedUserId: userId },
                        { ratedUserId: new Types.ObjectId(userId) }
                    ],
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalRatings: { $sum: 1 },
                    ratingBreakdown: {
                        $push: '$rating',
                    },
                },
            },
        ];

        const result = await this.ratingModel.aggregate(pipeline).exec();
        return result[0] || { averageRating: 0, totalRatings: 0, ratingBreakdown: [] };
    }

    async findExistingRating(raterId: string, truckOrderId?: string, orderId?: string): Promise<Rating | null> {
        const filter: any = {
            $or: [
                { raterId: raterId },
                { raterId: new Types.ObjectId(raterId) }
            ],
            isDeleted: false
        };

        if (truckOrderId) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { truckOrderId: truckOrderId },
                    { truckOrderId: new Types.ObjectId(truckOrderId) }
                ]
            });
        }

        if (orderId) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { orderId: orderId },
                    { orderId: new Types.ObjectId(orderId) }
                ]
            });
        }

        return this.ratingModel.findOne(filter).exec();
    }

    async update(id: string, updateData: any): Promise<Rating | null> {
        return this.ratingModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .populate('raterId', 'firstName lastName email')
            .exec();
    }

    async delete(id: string): Promise<Rating | null> {
        return this.ratingModel
            .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
            .exec();
    }

    async calculateAverageRating(userId: string): Promise<number> {
        // Try both string and ObjectId matching since the field might be stored as either
        const pipeline = [
            {
                $match: {
                    $or: [
                        { ratedUserId: userId },
                        { ratedUserId: new Types.ObjectId(userId) }
                    ],
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                },
            },
        ];

        const result = await this.ratingModel.aggregate(pipeline).exec();
        return result[0]?.averageRating || 0;
    }

    async findDistinctRatedUsers(): Promise<string[]> {
        const result = await this.ratingModel
            .distinct('ratedUserId', { isDeleted: false })
            .exec();

        return result.map((id: any) => id.toString());
    }
}
