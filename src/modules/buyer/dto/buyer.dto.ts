import { Types } from 'mongoose';

export type BuyerValues = 'reseller' | 'basic';

export interface BuyerDto {
  _id?: string | Types.ObjectId
  category: BuyerValues;
  userId: string | Types.ObjectId | undefined;
}
