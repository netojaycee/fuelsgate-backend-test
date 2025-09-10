import { Types } from "mongoose";
import { QueryDto } from "src/shared/types";

export type TruckStatus = 'pending' | 'available' | 'locked';
export type TruckType = 'flatbed' | 'tanker' | 'stepdeck' | 'dropdeck';

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
  // Optional flatbed / metadata fields
  deckLengthFt?: string;
  deckWidthFt?: string;
  maxPayloadKg?: string;
  notes?: string;
  country?: string;
  address?: string;
  flatbedSubtype?: string;
  equipment?: string[];
  preferredCargoTypes?: string[];
  truckFuelType?: 'diesel' | 'cng';
    truckCategory?: 'A++' | 'A' | 'B' | 'C';
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
    locationId?: string;
    truckFuelType?: 'diesel' | 'cng';
    truckCategory?: 'A++' | 'A' | 'B' | 'C';

  // New searchable fields
  flatbedSubtype?: string;
  equipment?: string; // comma-separated
  preferredCargoTypes?: string; // comma-separated
  deckLengthFt?: string;
  deckWidthFt?: string;
  maxPayloadKg?: string;
}