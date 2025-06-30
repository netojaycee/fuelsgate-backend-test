import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from 'src/modules/user/entities/user.entity';
import { Role } from './role.entities';

export type RoleDocument = HydratedDocument<UserRole>;

@Schema({ versionKey: false })
export class UserRole {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Role.name, required: true })
  roleId: Types.ObjectId;
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRole);
