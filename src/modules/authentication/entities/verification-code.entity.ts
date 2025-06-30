import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VerificationCodeDocument = HydratedDocument<VerificationCode>;

@Schema({ versionKey: false, timestamps: true })
export class VerificationCode {
  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  otp: number;
}

export const VerificationCodeSchema =
  SchemaFactory.createForClass(VerificationCode);
