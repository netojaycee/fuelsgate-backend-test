import { Types } from 'mongoose';

export type SellerValues = 'depot-owner' | 'trader';

export interface SellerDto {
  _id?: string | Types.ObjectId
  userId: string | Types.ObjectId
  category: SellerValues;
  profilePicture: string;
  businessName: string;
  depotName: string;
  phoneNumber: string;
  officeAddress: string;
  depotHub: string;
  products: string[];
}
