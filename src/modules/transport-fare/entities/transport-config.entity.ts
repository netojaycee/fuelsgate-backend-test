import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TransportConfig extends Document {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  value: number;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string; // 'fuel', 'maintenance', 'profit', 'fixed_costs'
}

export const TransportConfigSchema = SchemaFactory.createForClass(TransportConfig);
