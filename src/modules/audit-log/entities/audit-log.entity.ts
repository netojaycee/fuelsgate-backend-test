import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

// Create a sub-schema for location
@Schema({ _id: false })
export class Location {
    @Prop()
    country?: string;

    @Prop()
    region?: string;

    @Prop()
    city?: string;

    @Prop()
    timezone?: string;
}

// Create a sub-schema for metadata
@Schema({ _id: false })
export class Metadata {
    @Prop()
    targetId?: string;

    @Prop()
    targetType?: string;

    @Prop({ type: Object })
    oldValue?: any;

    @Prop({ type: Object })
    newValue?: any;

    @Prop({ type: Object })
    additionalInfo?: any;
}

@Schema({ timestamps: true })
export class AuditLog {
    @Prop({ type: Types.ObjectId, ref: 'User', required: false })
    userId?: Types.ObjectId;

    @Prop({ required: true })
    userEmail?: string;

    @Prop({ required: true })
    userName?: string;

    @Prop({ required: true })
    action: string; // e.g., 'CREATE_USER', 'UPDATE_STATUS', 'LOGIN', 'LOGOUT'

    @Prop({ required: true })
    module: string; // e.g., 'USER', 'PRODUCT', 'ORDER', 'AUTHENTICATION'

    @Prop({ required: true })
    method: string; // HTTP method: POST, PUT, PATCH, DELETE

    @Prop({ required: true })
    endpoint: string; // API endpoint

    @Prop({ type: Object })
    requestData?: any; // Request body/params (sanitized)

    @Prop({ type: Object })
    responseData?: any; // Response data (sanitized)

    @Prop()
    ipAddress?: string;

    @Prop()
    userAgent?: string;

    @Prop()
    browser?: string;

    @Prop()
    os?: string; @Prop()
    device?: string;

    @Prop({ type: Location })
    location?: Location;

    @Prop({ required: true })
    status: 'SUCCESS' | 'FAILED' | 'ERROR';

    @Prop()
    errorMessage?: string;

    @Prop()
    executionTime?: number; // in milliseconds

    @Prop({ type: Metadata })
    metadata?: Metadata;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Create schemas for sub-documents
export const LocationSchema = SchemaFactory.createForClass(Location);
export const MetadataSchema = SchemaFactory.createForClass(Metadata);

// Add indexes for better query performance
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ module: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ status: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });
