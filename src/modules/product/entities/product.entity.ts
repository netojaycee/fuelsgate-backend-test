import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ versionKey: false, timestamps: true })
export class Product {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  value: string;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true, enum: ['active', 'inactive'] })
  status: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
