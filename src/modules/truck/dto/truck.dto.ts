import { Types } from "mongoose";
import { QueryDto } from "src/shared/types";

export type TruckStatus = 'pending' | 'available' | 'locked';
export type TruckType = 'flatbed' | 'tanker'

export interface TruckDto {
  truckType: TruckType;
  profileId?: string | Types.ObjectId;
  currentState?: string;
  currentCity?: string;
  profileType?: string;
  truckNumber: string
  capacity?: string
  depotHubId?: string | Types.ObjectId
  depot?: string
  status?: TruckStatus
  productId?: string | Types.ObjectId
  ownerId?: string;
  truckOwner?: string;
  ownerLogo?: string;
  loadStatus?: "loaded" | "unloaded";
}

export interface TruckQueryDto extends QueryDto {
  truckType?: TruckType;
  profileId?: string;
  status?: string
  depotHubId?: string
  productId?: string
  size?: string
  loadStatus?: string; // New field for load status
  currentState?: string;
  currentCity?: string;
}