import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DepotHub } from 'src/modules/depot-hub/entities/depot-hub.entity';
import { Product } from 'src/modules/product/entities/product.entity';

export type TruckDocument = HydratedDocument<Truck>;

@Schema({ versionKey: false, timestamps: true })
export class Truck {
  @Prop({ required: true, unique: true })
  truckNumber: string;

  @Prop({ required: true })
  capacity: string;

  @Prop({ type: Types.ObjectId, ref: DepotHub.name, required: true })
  depotHubId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  profileId: Types.ObjectId;

  @Prop({ type: String, enum: ['Transporter', 'Seller'], required: true })
  profileType: string;

  @Prop({ required: true })
  depot: string;

  @Prop({ default: null })
  currentState: string;

  @Prop({ default: null })
  currentCity: string;

  @Prop({ required: true, enum: ['available', 'locked'], default: 'available' })
  status: string;
}

export const TruckSchema = SchemaFactory.createForClass(Truck);
