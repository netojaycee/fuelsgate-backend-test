import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuthenticationDocument = HydratedDocument<Authentication>;

@Schema()
export class Authentication {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  loginTime: Date;

  @Prop({ default: null })
  logoutTime: Date;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  browser: string;
}

export const AuthenticationSchema =
  SchemaFactory.createForClass(Authentication);
