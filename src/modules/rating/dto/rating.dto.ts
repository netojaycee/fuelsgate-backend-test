import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max, IsMongoId } from 'class-validator';

export class CreateRatingDto {
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    rating: number;

    @IsOptional()
    @IsString()
    review?: string;

    @IsOptional()
    @IsMongoId()
    truckOrderId?: string;

    @IsOptional()
    @IsMongoId()
    orderId?: string;
}

export class RatingQueryDto {
    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    limit?: string;

    @IsOptional()
    @IsMongoId()
    userId?: string;

    @IsOptional()
    @IsString()
    orderType?: 'truck-order' | 'order';
}

export interface IRatingResponse {
    _id: string;
    raterId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    ratedUserId: string;
    rating: number;
    review: string;
    orderType: string;
    truckOrderId?: string;
    orderId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserRatingStats {
    userId: string;
    averageRating: number;
    totalRatings: number;
    ratingBreakdown: {
        [key: number]: number; // 1: count, 2: count, etc.
    };
    recentReviews: IRatingResponse[];
}
