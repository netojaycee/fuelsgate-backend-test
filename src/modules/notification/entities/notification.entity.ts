import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: String, required: true })
    type: string; // 'chat', 'order', 'order_status', 'truck_status', etc.

    @Prop({ type: String })
    message?: string;

    @Prop({ type: Types.ObjectId })
    relatedId?: Types.ObjectId; // negotiationId, orderId, truckId, etc.

    @Prop({ type: Boolean, default: false })
    read: boolean;

    @Prop({ type: Object })
    meta?: any; // for extra info
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
