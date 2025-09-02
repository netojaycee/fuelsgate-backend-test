import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class LocationDistance extends Document {
  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  lga: string;

  @Prop({ required: true })
  loadPoint: string;

  @Prop({ required: true })
  distanceKM: number;

  @Prop({ default: 'excel_upload' })
  source: string; // 'excel_upload', 'maps_api', 'manual'
}

export const LocationDistanceSchema = SchemaFactory.createForClass(LocationDistance);

// Create compound index for efficient queries
LocationDistanceSchema.index({ state: 1, lga: 1, loadPoint: 1 }, { unique: true });
