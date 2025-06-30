import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IUser } from '../dto/user.dto';

export type UserDocument = HydratedDocument<User>;

@Schema({ versionKey: false, timestamps: true })
export class User implements IUser {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ required: true, lowercase: true, unique: true })
  email: string;

  @Prop({ default: null, select: false })
  password: string;

  @Prop({ default: new Date().getTime() })
  lastSeen: Date;

  @Prop({ default: null })
  provider: string;
  @Prop({ default: null })
  providerId: string;

  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
