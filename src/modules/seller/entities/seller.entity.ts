import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/modules/user/entities/user.entity';

export type SellerDocument = HydratedDocument<Seller>;

@Schema({ versionKey: false, timestamps: true })
export class Seller {
  @Prop({ required: true, enum: ['depot-owner', 'trader'] })
  category: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  businessName: string;

  @Prop({ required: false, default: null })
  depotName: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: false, default: null })
  profilePicture: string;

  @Prop({ required: false })
  officeAddress: string;

  @Prop({ required: true })
  depotHub: string;

  @Prop({ required: true, type: [String] })
  products: string[];
}

export const SellerSchema = SchemaFactory.createForClass(Seller);
