import { HydratedDocument, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DepotHub } from 'src/modules/depot-hub/entities/depot-hub.entity';
import { Product } from 'src/modules/product/entities/product.entity';

export type TruckDocument = HydratedDocument<Truck>;

@Schema({ versionKey: false, timestamps: true })
export class Truck {
  @Prop({ required: true, unique: true })
  truckNumber: string;

  @Prop({ required: false })
  capacity: string;

  @Prop({ type: Types.ObjectId, ref: DepotHub.name, required: false })
  depotHubId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Product.name, required: false })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  profileId: Types.ObjectId;

  @Prop({ type: String, enum: ['transporter', 'seller'], required: true })
  profileType: string;

  @Prop({ required: false })
  truckOwner: string;

  @Prop({ required: false })
  ownerId: string;
  // userid of truck owner

  @Prop({ required: false })
  ownerLogo: string;

  @Prop({ required: false })
  depot: string;

  @Prop({ default: null })
  currentState: string;

  @Prop({ default: null })
  currentCity: string;

  @Prop({ required: false, enum: ['loaded', 'unloaded'], default: 'unloaded' })
  loadStatus: string;

  @Prop({ required: true, enum: ['pending', 'available', 'locked'], default: 'pending' })
  status: string;

  @Prop({ required: true, enum: ['tanker', 'flatbed', 'stepdeck', 'dropdeck'], default: 'tanker' })
  truckType: string;

   // --- New optional fields (flatbed / metadata) ---
  @Prop({ required: false })
  deckLengthFt?: string;

  @Prop({ required: false })
  deckWidthFt?: string;

  @Prop({ required: false })
  maxPayloadKg?: string;

  @Prop({ required: false })
  notes?: string;

  @Prop({ required: false, default: 'Nigeria' })
  country?: string;

  @Prop({ required: false })
  address?: string;

  @Prop({ required: false })
  flatbedSubtype?: string;

  @Prop({ type: [String], required: false, default: [] })
  equipment?: string[];

  @Prop({ type: [String], required: false, default: [] })
  preferredCargoTypes?: string[];

  @Prop({ required: true, enum: ['A++', 'A', 'B', 'C'], default: 'A' })
  truckCategory?: string;

  @Prop({ required: true, enum: ['diesel', 'cng'], default: 'diesel' })
  truckFuelType?: string;
}

export const TruckSchema = SchemaFactory.createForClass(Truck);
