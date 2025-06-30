import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'audit_log';

export interface AuditLogMetadata {
    action: string;
    module: string;
    description?: string;
    includeRequestBody?: boolean;
    includeResponseBody?: boolean;
    skipLogging?: boolean;
}

export const AuditLog = (metadata: AuditLogMetadata) =>
    SetMetadata(AUDIT_LOG_KEY, metadata);
