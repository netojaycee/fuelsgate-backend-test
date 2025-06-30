import { Types } from "mongoose";
import { QueryDto } from "src/shared/types";

export type OrderStatus = 'awaiting-approval' | 'in-progress' | 'completed' | 'cancelled';

export interface OrderDto {
  sellerId?: string | Types.ObjectId;
  buyerId?: string | Types.ObjectId;
  productUploadId?: string | Types.ObjectId;
  price: number
  trackingId: string
  status: OrderStatus
  volume: number
  expiresIn: Date
}

export interface OrderQueryDto extends QueryDto {
  trackingId: string
  status: OrderStatus
  buyerId: string
  sellerId: string
  productUploadId: string
}