import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type DepotHubDocument = HydratedDocument<DepotHub>;

@Schema({ versionKey: false, timestamps: true })
export class DepotHub {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, enum: ['tanker', 'others'], default: 'tanker' })
  type: string;

  @Prop({ required: true })
  depots: string[];
}

export const DepotHubSchema = SchemaFactory.createForClass(DepotHub);
