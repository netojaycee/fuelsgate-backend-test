import { Types } from 'mongoose';
import { QueryDto } from 'src/shared/types';

export type TruckOrderStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'cancelled';
export type TruckOrderRFQStatus = 'pending' | 'sent' | 'accepted' | 'rejected';

export interface TruckOrderDto {
  truckId?: string | Types.ObjectId;
  profileId?: string | Types.ObjectId;
  profileType: string;
  buyerId?: string | Types.ObjectId;
  orderId?: string | Types.ObjectId;
  price: number;
  status: TruckOrderStatus;
  rfqStatus: TruckOrderRFQStatus;
  loadingDate?: Date;
  loadingDepot: string;
  // loadingCity: string;
  // loadingAddress: string;
  arrivalTime?: Date;
  trackingId: string;
  destination?: string;
  state?: string;
  city?: string;
  isRated?: boolean;
}

export interface TruckOrderQueryDto extends QueryDto {
  truckId: string;
  trackingId: string;
  orderId: string;
  status: TruckOrderStatus;
  buyerId: string;
  profileId?: string;
  profileType?: string;
}
