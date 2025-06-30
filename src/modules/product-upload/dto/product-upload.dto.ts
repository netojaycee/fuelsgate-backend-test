import { Types } from "mongoose";
import { QueryDto } from "src/shared/types";

export type ProductUploadStatus = 'active' | 'expired';

export interface ProductUploadDto {
  _id?: string | Types.ObjectId;
  sellerId?: string | Types.ObjectId;
  productId?: string | Types.ObjectId;
  depotHubId?: string | Types.ObjectId;
  depot: string
  volume: number
  price: number
  expiresIn: Date
  productQuality?: string | null
  status: ProductUploadStatus
}

export interface ProductUploadQueryDto extends QueryDto {
  productId?: string | Types.ObjectId;
  depotHubId?: string | Types.ObjectId;
  sellerId?: string | Types.ObjectId;
  volume?: number
  status?: ProductUploadStatus
}