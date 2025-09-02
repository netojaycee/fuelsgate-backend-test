import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class LoadPoint extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  lga: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const LoadPointSchema = SchemaFactory.createForClass(LoadPoint);
