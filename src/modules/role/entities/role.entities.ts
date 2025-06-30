import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ versionKey: false, timestamps: true })
export class Role {
  @Prop({ required: true, enum: ['buyer', 'seller', 'transporter', 'admin'] })
  name: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
