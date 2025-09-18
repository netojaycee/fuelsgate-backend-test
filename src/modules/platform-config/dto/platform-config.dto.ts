import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreatePlatformConfigDto {
    @IsNotEmpty()
    @IsString()
    key: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    value: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdatePlatformConfigDto {
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Max(100)
    value: number;

    @IsOptional()
    @IsString()
    description?: string;
}

export class PlatformConfigQueryDto {
    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    limit?: string;

    @IsOptional()
    @IsString()
    key?: string;
}

export interface ServiceFeeConfig {
    transporterServiceFee: number;
    traderServiceFee: number;
    traderServiceFeeLoaded: number;
    transporterServiceFeeLoaded: number;
}
