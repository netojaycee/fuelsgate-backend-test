import { Types } from 'mongoose';
import { RoleType } from 'src/modules/role/dto/role.dto';

export interface IUser {
  _id?: Types.ObjectId | string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  status: string;
  lastSeen: Date;
  providerId?: string;
  provider?: string;
  averageRating?: number;
}

export interface IUserWithRole extends IUser {
  role: RoleType;
}

export type UpdatePasswordDto = {
  currentPassword: string
  password: string
}

export type ToggleStatusDto = {
  status: 'active' | 'inactive' | 'suspended' | 'pending';
}

export interface UserQueryDto {
  role?: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}
