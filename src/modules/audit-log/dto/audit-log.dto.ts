import { Types } from 'mongoose';

export interface LocationDto {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
}

export interface MetadataDto {
    targetId?: string;
    targetType?: string;
    oldValue?: any;
    newValue?: any;
    additionalInfo?: any;
}

export interface CreateAuditLogDto {
    userId?: Types.ObjectId | string;
    userEmail?: string;
    userName?: string;
    action: string;
    module: string;
    method: string;
    endpoint: string;
    requestData?: any;
    responseData?: any;
    ipAddress?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    location?: LocationDto;
    status: 'SUCCESS' | 'FAILED' | 'ERROR';
    errorMessage?: string;
    executionTime?: number;
    metadata?: MetadataDto;
}

export interface AuditLogQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    module?: string;
    action?: string;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: 'createdAt' | 'action' | 'module' | 'status';
    sortOrder?: 'asc' | 'desc';
}

export interface AuditLogResponseDto {
    _id: string;
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: string;
    module: string;
    method: string;
    endpoint: string;
    requestData?: any;
    responseData?: any;
    ipAddress?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    location?: LocationDto;
    status: 'SUCCESS' | 'FAILED' | 'ERROR';
    errorMessage?: string;
    executionTime?: number;
    metadata?: MetadataDto;
    createdAt: Date;
    updatedAt: Date;
}
