import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Order } from 'src/modules/order/entities/order.entity';
import { User } from 'src/modules/user/entities/user.entity';

export type NegotiationDocument = HydratedDocument<Negotiation>;

@Schema({ versionKey: false, timestamps: true })
export class Negotiation {
    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    senderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: User.name, required: true })
    receiverId: Types.ObjectId;

    @Prop({ type: String, enum: ['product', 'truck'], required: true })
    type: 'product' | 'truck';

    @Prop({ type: Types.ObjectId, ref: Order.name, required: true })
    orderId?: Types.ObjectId;

    @Prop({ default: 'ongoing', enum: ['ongoing', 'completed', 'cancelled'] })
    status: string;

}

export const NegotiationSchema = SchemaFactory.createForClass(Negotiation);
