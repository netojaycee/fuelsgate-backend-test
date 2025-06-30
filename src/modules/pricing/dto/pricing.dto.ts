import { QueryDto } from 'src/shared/types';
import { Types } from 'mongoose';
export interface PricingDto {
  productId: Types.ObjectId | string;
  depotHubId: Types.ObjectId | string;
  depot: string;
  activeStatus: boolean;
  positive: boolean;
  price: number;
}

export interface PricingQueryDto extends QueryDto {}
