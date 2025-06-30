import { Injectable } from '@nestjs/common';
import { AuditLogService } from 'src/modules/audit-log/services/audit-log.service';

@Injectable()
export class AuditLogHelper {
    constructor(private readonly auditLogService: AuditLogService) { }

    async logUserAction(
        req: any,
        action: string,
        module: string,
        targetId?: string,
        oldValue?: any,
        newValue?: any,
        additionalInfo?: any,
    ) {
        const logData = this.auditLogService.extractAuditData(
            req,
            action,
            module,
            undefined,
            {
                targetId,
                targetType: module,
                oldValue,
                newValue,
                additionalInfo,
            },
        );

        return await this.auditLogService.createLog({
            ...logData,
            status: 'SUCCESS',
        });
    }

    async logError(
        req: any,
        action: string,
        module: string,
        error: Error,
        targetId?: string,
    ) {
        const logData = this.auditLogService.extractAuditData(
            req,
            action,
            module,
            undefined,
            {
                targetId,
                targetType: module,
                additionalInfo: { error: error.stack },
            },
        );

        return await this.auditLogService.createLog({
            ...logData,
            status: 'ERROR',
            errorMessage: error.message,
        });
    }
}
