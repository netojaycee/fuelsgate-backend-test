import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/modules/user/entities/user.entity';
import { AdminValues } from '../dto/admin.dto';

export type AdminDocument = HydratedDocument<Admin>;

@Schema({ versionKey: false, timestamps: true })
export class Admin {
  @Prop({ required: true, enum: ['superadmin', 'admin', 'staff'] })
  category: AdminValues;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId: Types.ObjectId;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
