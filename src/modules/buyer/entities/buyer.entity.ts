import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/modules/user/entities/user.entity';

export type BuyerDocument = HydratedDocument<Buyer>;

@Schema({ versionKey: false, timestamps: true })
export class Buyer {
  @Prop({ required: true, enum: ['reseller', 'basic-consumer'] })
  category: string;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId: Types.ObjectId;
}

export const BuyerSchema = SchemaFactory.createForClass(Buyer);
