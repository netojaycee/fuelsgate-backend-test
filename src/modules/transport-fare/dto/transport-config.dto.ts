import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateTransportConfigDto {
  @IsString()
  key: string;

  @IsNumber()
  value: number;

  @IsString()
  description: string;

  @IsString()
  category: string; // 'fuel', 'maintenance', 'profit', 'fixed_costs'
}

export class UpdateTransportConfigDto {
  @IsNumber()
  value: number;

  @IsOptional()
  @IsString()
  description?: string;
}
