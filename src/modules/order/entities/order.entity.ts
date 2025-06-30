import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Buyer } from 'src/modules/buyer/entities/buyer.entity';
import { ProductUpload } from 'src/modules/product-upload/entities/product-upload.entity';
import { Seller } from 'src/modules/seller/entities/seller.entity';
import { OrderStatus } from '../dto/order.dto';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ versionKey: false, timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true })
  sellerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Buyer.name, required: true })
  buyerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: ProductUpload.name, required: true })
  productUploadId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  trackingId: string;

  @Prop({ default: null })
  price: number;

  @Prop({ default: null })
  volume: number;

  @Prop({ default: 'awaiting-approval', enum: ['awaiting-approval', 'in-progress', 'completed', 'cancelled'] })
  status: OrderStatus

  @Prop({ default: null })
  expiresIn: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
