import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DepotHub } from 'src/modules/depot-hub/entities/depot-hub.entity';
import { Product } from 'src/modules/product/entities/product.entity';
import { Seller } from 'src/modules/seller/entities/seller.entity';

export type ProductUploadDocument = HydratedDocument<ProductUpload>;

@Schema({ versionKey: false, timestamps: true })
export class ProductUpload {
  @Prop({ type: Types.ObjectId, ref: Seller.name, required: true })
  sellerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: DepotHub.name, required: true })
  depotHubId: Types.ObjectId;

  @Prop({ required: true })
  volume: number;

  @Prop({ required: true })
  price: number;

  @Prop({ required: false, default: null })
  depot: string;

  @Prop({ required: true })
  expiresIn: Date;

  @Prop({ required: false, default: null })
  productQuality: string;

  @Prop({ required: true, enum: ['active', 'expired'], default: 'active' })
  status: string;
}

export const ProductUploadSchema = SchemaFactory.createForClass(ProductUpload);
