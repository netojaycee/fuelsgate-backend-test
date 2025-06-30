import { Types } from 'mongoose';
import { QueryDto } from 'src/shared/types';

export type OfferStatus = 'ongoing' | 'completed' | 'cancelled';

export interface OfferDto {
  _id?: string | Types.ObjectId;
  senderId?: string | Types.ObjectId;
  receiverId?: string | Types.ObjectId;
  productUploadId?: string | Types.ObjectId;
  orderId?: string | Types.ObjectId;
  status: OfferStatus | string;
  volume: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OfferQueryDto extends QueryDto {
  status: OfferStatus;
  profileId: string;
  productUploadId: string;
}
