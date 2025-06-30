import { Types } from "mongoose";
import { QueryDto } from "src/shared/types";

export type MessageStatus = 'pending' | 'accepted' | 'rejected';

export interface MessageDto {
  offerId?: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
  status: MessageStatus
  actionBy?: string | Types.ObjectId;
  offer: number
}

export interface MessageQueryDto extends QueryDto {
  offer: number
  status: MessageStatus
}