import { Document, Types } from 'mongoose';

export interface UserRoleDto extends Document {
  userId: Types.ObjectId;
  roleId: Types.ObjectId;
  id?: Types.ObjectId;
}
