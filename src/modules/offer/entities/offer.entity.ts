import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { Order } from "src/modules/order/entities/order.entity";
import { ProductUpload } from "src/modules/product-upload/entities/product-upload.entity";
import { User } from "src/modules/user/entities/user.entity";

export type OfferDocument = HydratedDocument<Offer>;

@Schema({ versionKey: false, timestamps: true })
export class Offer {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  receiverId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: ProductUpload.name, required: true })
  productUploadId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Order.name, default: null })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  volume: number

  @Prop({ default: 'ongoing', enum: ['ongoing', 'completed', 'cancelled'] })
  status: string
}

export const OfferSchema = SchemaFactory.createForClass(Offer);
