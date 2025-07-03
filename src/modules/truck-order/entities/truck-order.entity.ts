import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Buyer } from 'src/modules/buyer/entities/buyer.entity';
import { Order } from 'src/modules/order/entities/order.entity';
import { Truck } from 'src/modules/truck/entities/truck.entity';
import { TruckOrderRFQStatus, TruckOrderStatus } from '../dto/truck-order.dto';

export type TruckOrderDocument = HydratedDocument<TruckOrder>;

@Schema({ versionKey: false, timestamps: true })
export class TruckOrder {
  @Prop({ type: Types.ObjectId, ref: Truck.name, required: true })
  truckId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Buyer.name, required: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  profileId: Types.ObjectId;

  @Prop({ type: String, enum: ['Transporter', 'Seller'], required: true })
  profileType: string;

  @Prop({ type: Types.ObjectId, ref: Order.name, default: null })
  orderId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  trackingId: string;

  @Prop({ required: true })
  destination: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string;

  @Prop({ default: null })
  price: number;

  @Prop({ default: null })
  loadingDate: Date;

  // @Prop({ required: true })
  // loadingState: string;

  // @Prop({ required: true })
  // loadingCity: string;

  @Prop({ required: true })
  loadingDepot: string;

  @Prop({ default: null })
  arrivalTime: Date;

  @Prop({
    default: 'pending',
    enum: ['pending', 'sent', 'accepted', 'rejected'],
  })
  rfqStatus: TruckOrderRFQStatus;

  @Prop({
    default: 'pending',
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
  })
  status: TruckOrderStatus;

  @Prop({ default: false })
  isRated: boolean;
}

export const TruckOrderSchema = SchemaFactory.createForClass(TruckOrder);
