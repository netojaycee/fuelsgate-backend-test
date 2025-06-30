import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Product } from 'src/modules/product/entities/product.entity';
import { DepotHub } from 'src/modules/depot-hub/entities/depot-hub.entity';

export type pricingDocument = HydratedDocument<Pricing>;

@Schema({ versionKey: false, timestamps: true })
export class Pricing {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: DepotHub.name, required: true })
  depotHubId: Types.ObjectId;

  @Prop({ required: true })
  depot: string;

  @Prop({ required: true, default: true })
  activeStatus: boolean;

  @Prop({ required: true, default: true })
  positive: boolean;

  @Prop({ required: true })
  price: number;
}

export const pricingSchema = SchemaFactory.createForClass(Pricing);
