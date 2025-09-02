import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export enum TruckType {
  TANKER = 'tanker',
  FLATBED = 'flatbed',
}

export class CalculateFareDto {
  @IsOptional()
  @IsString()
  truckId?: string;

  @IsNumber()
  truckCapacity: number;

  @IsEnum(TruckType)
  truckType: TruckType;

  @IsString()
  deliveryState: string;

  @IsString()
  deliveryLGA: string;

  @IsString()
  loadPoint: string; // e.g., 'Ibeju_Dangote' - where fuel is loaded FROM
}

export class BulkUploadDistanceDto {
  @IsString()
  state: string;

  @IsString()
  lga: string;

  @IsString()
  loadPoint: string;

  @IsNumber()
  distanceKM: number;
}

export class CreateLoadPointDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  state: string;

  @IsString()
  lga: string;
}
