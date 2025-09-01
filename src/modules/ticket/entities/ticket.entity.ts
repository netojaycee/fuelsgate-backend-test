import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Order } from 'src/modules/order/entities/order.entity';

@Schema({ versionKey: false, timestamps: true })
export class Ticket {
    @Prop({ type: Types.ObjectId, ref: Order.name, required: true, unique: true })
    orderId: Types.ObjectId;

    @Prop({ required: true })
    transportFee: number;

    @Prop({ required: true })
    transporterServiceFee: number;

    @Prop({ required: true })
    buyerServiceFee: number;
}

export type TicketDocument = HydratedDocument<Ticket>;
export const TicketSchema = SchemaFactory.createForClass(Ticket);
