import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Negotiation } from 'src/modules/negotiation/entities/negotiation.entity';
import { Order } from 'src/modules/order/entities/order.entity';
import { User } from 'src/modules/user/entities/user.entity';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ versionKey: false, timestamps: true })
export class Message {
    @Prop({ required: true, type: Types.ObjectId, ref: User.name })
    userId: Types.ObjectId;

    @Prop({ required: true, type: Types.ObjectId, ref: User.name })
    receiverId: Types.ObjectId;

    @Prop({ required: true, type: Types.ObjectId, ref: Negotiation.name })
    negotiationId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Order.name, required: true })
    orderId: Types.ObjectId;

    @Prop()
    content: string;

    @Prop()
    offerPrice: number;

    @Prop({ required: true, enum: ['user', 'system'], default: 'user' })
    messageType: string;

    @Prop({ required: true, enum: ['sent', 'delivered', 'read'], default: 'sent' })
    status: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
