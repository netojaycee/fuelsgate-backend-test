import { Types } from 'mongoose';

export type AdminValues = 'superadmin' | 'admin' | 'staff';

export interface AdminDto {
  _id?: string | Types.ObjectId
  category: AdminValues;
  userId: string | Types.ObjectId | undefined;
}
