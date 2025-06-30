import { Types } from "mongoose";
import { QueryDto } from "src/shared/types";

export type TruckStatus = 'available' | 'locked';

export interface TruckDto {
  profileId?: string | Types.ObjectId;
  currentState?: string;
  currentCity?: string;
  profileType: string;
  truckNumber: string
  capacity: string
  depotHubId: string | Types.ObjectId
  depot: string
  status: TruckStatus
  productId: string | Types.ObjectId
}

export interface TruckQueryDto extends QueryDto {
  profileId?: string;
  status?: string
  depotHubId?: string
  productId?: string
  size?: string
}