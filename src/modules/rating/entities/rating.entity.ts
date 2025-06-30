import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/modules/user/entities/user.entity';
import { TruckOrder } from 'src/modules/truck-order/entities/truck-order.entity';
import { Order } from 'src/modules/order/entities/order.entity';

export type RatingDocument = HydratedDocument<Rating>;

@Schema({ versionKey: false, timestamps: true })
export class Rating {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    raterId: Types.ObjectId; // User who gives the rating

    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    ratedUserId: Types.ObjectId; // User being rated

    @Prop({ required: true, min: 1, max: 5 })
    rating: number; // Rating value (1-5 stars)

    @Prop({ default: null, maxlength: 500 })
    review: string; // Optional review text

    @Prop({ type: Types.ObjectId, ref: TruckOrder.name, default: null })
    truckOrderId: Types.ObjectId; // Reference to truck order

    @Prop({ type: Types.ObjectId, ref: Order.name, default: null })
    orderId: Types.ObjectId; // Reference to regular order

    @Prop({ required: true, enum: ['truck-order', 'order'] })
    orderType: string; // Type of order this rating is for

    @Prop({ default: false })
    isDeleted: boolean;

    createdAt: Date;
    updatedAt: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

// Create compound indexes to prevent duplicate ratings for the same order
RatingSchema.index({ raterId: 1, truckOrderId: 1 }, { unique: true, sparse: true });
RatingSchema.index({ raterId: 1, orderId: 1 }, { unique: true, sparse: true });
