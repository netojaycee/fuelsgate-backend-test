import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from 'src/modules/audit-log/services/audit-log.service';
import { AUDIT_LOG_KEY, AuditLogMetadata } from '../decorators/audit-log.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditLogInterceptor.name);

    constructor(
        private readonly auditLogService: AuditLogService,
        private readonly reflector: Reflector,
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Skip GET requests unless specifically marked for logging
        if (request.method === 'GET') {
            const auditMetadata = this.reflector.get<AuditLogMetadata>(
                AUDIT_LOG_KEY,
                context.getHandler(),
            );
            if (!auditMetadata) {
                return next.handle();
            }
        }

        const startTime = Date.now();

        // Get audit metadata from decorator
        const auditMetadata = this.reflector.get<AuditLogMetadata>(
            AUDIT_LOG_KEY,
            context.getHandler(),
        );

        // Skip logging if explicitly disabled
        if (auditMetadata?.skipLogging) {
            return next.handle();
        }

        return next.handle().pipe(
            tap((responseData) => {
                this.logSuccess(request, response, responseData, auditMetadata, startTime);
            }),
            catchError((error) => {
                this.logError(request, response, error, auditMetadata, startTime);
                return throwError(error);
            }),
        );
    }

    private async logSuccess(
        request: any,
        response: any,
        responseData: any,
        auditMetadata: AuditLogMetadata,
        startTime: number,
    ) {
        try {
            const executionTime = Date.now() - startTime;

            const logData = this.auditLogService.extractAuditData(
                request,
                auditMetadata?.action || this.getDefaultAction(request.method, request.route?.path),
                auditMetadata?.module || this.getModuleFromPath(request.route?.path || request.url),
                auditMetadata?.includeResponseBody !== false ? this.sanitizeResponseData(responseData) : undefined,
            );

            await this.auditLogService.createLog({
                ...logData,
                status: 'SUCCESS',
                executionTime,
            });
        } catch (error) {
            this.logger.error('Failed to create audit log:', error.message);
            // Don't throw error to avoid breaking the main request
        }
    }

    private async logError(
        request: any,
        response: any,
        error: any,
        auditMetadata: AuditLogMetadata,
        startTime: number,
    ) {
        try {
            const executionTime = Date.now() - startTime;

            const logData = this.auditLogService.extractAuditData(
                request,
                auditMetadata?.action || this.getDefaultAction(request.method, request.route?.path),
                auditMetadata?.module || this.getModuleFromPath(request.route?.path || request.url),
                undefined, // Don't include response data for errors
            );

            await this.auditLogService.createLog({
                ...logData,
                status: 'ERROR',
                errorMessage: error.message || 'Unknown error',
                executionTime,
            });
        } catch (logError) {
            this.logger.error('Failed to create error audit log:', logError.message);
            // Don't throw error to avoid breaking the main request
        }
    }

    private sanitizeResponseData(responseData: any): any {
        if (!responseData) return responseData;

        try {
            // Handle different response types
            if (responseData instanceof Buffer) {
                return { message: '[Buffer Response]', size: responseData.length };
            }

            if (responseData instanceof String || typeof responseData === 'string') {
                return responseData.length > 1000 ? responseData.substring(0, 1000) + '...[truncated]' : responseData;
            }

            // For objects, use a more sophisticated serialization
            const serialized = this.deepSerialize(responseData, new Set(), 0, 3);

            // Check size after serialization
            const stringified = JSON.stringify(serialized);
            if (stringified.length > 5000) {
                // If still too large, extract just the essential parts
                return this.extractEssentialResponseData(responseData);
            }

            return serialized;
        } catch (error) {
            // If all else fails, try to extract basic info
            return this.extractEssentialResponseData(responseData);
        }
    }

    private deepSerialize(obj: any, visited: Set<any>, depth: number, maxDepth: number): any {
        // Prevent infinite depth
        if (depth > maxDepth) {
            return '[Max depth reached]';
        }

        // Handle primitives
        if (obj === null || obj === undefined) return obj;
        if (typeof obj !== 'object') return obj;

        // Handle circular references
        if (visited.has(obj)) {
            return '[Circular Reference]';
        }

        visited.add(obj);

        try {
            // Handle arrays
            if (Array.isArray(obj)) {
                const result = obj.slice(0, 50).map(item =>
                    this.deepSerialize(item, new Set(visited), depth + 1, maxDepth)
                );
                if (obj.length > 50) {
                    result.push(`[...${obj.length - 50} more items]`);
                }
                return result;
            }

            // Handle objects
            const result: any = {};
            let keyCount = 0;

            for (const key in obj) {
                if (keyCount >= 20) { // Limit number of keys
                    result['...'] = '[More properties truncated]';
                    break;
                }

                if (obj.hasOwnProperty(key)) {
                    try {
                        result[key] = this.deepSerialize(obj[key], new Set(visited), depth + 1, maxDepth);
                        keyCount++;
                    } catch (keyError) {
                        result[key] = '[Error serializing property]';
                    }
                }
            }

            return result;
        } finally {
            visited.delete(obj);
        }
    }

    private extractEssentialResponseData(responseData: any): any {
        try {
            // Try to extract common response patterns
            if (responseData && typeof responseData === 'object') {
                const essential: any = {};

                // Common response fields
                const commonFields = ['message', 'data', 'status', 'statusCode', 'error', 'success'];

                for (const field of commonFields) {
                    if (responseData.hasOwnProperty(field)) {
                        try {
                            if (typeof responseData[field] === 'object') {
                                essential[field] = this.simplifyObject(responseData[field]);
                            } else {
                                essential[field] = responseData[field];
                            }
                        } catch {
                            essential[field] = '[Could not extract]';
                        }
                    }
                }

                // If we got some data, return it
                if (Object.keys(essential).length > 0) {
                    return essential;
                }
            }

            // Last resort: return type info
            return {
                type: typeof responseData,
                constructor: responseData?.constructor?.name || 'Unknown',
                message: '[Response structure too complex to serialize]'
            };
        } catch {
            return { message: '[Response could not be processed]' };
        }
    }

    private simplifyObject(obj: any): any {
        if (!obj || typeof obj !== 'object') return obj;

        try {
            if (Array.isArray(obj)) {
                return obj.length > 10 ?
                    [...obj.slice(0, 10), `[...${obj.length - 10} more items]`] :
                    obj;
            }

            const simplified: any = {};
            let count = 0;

            for (const key in obj) {
                if (count >= 10) {
                    simplified['...'] = '[More properties]';
                    break;
                }

                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    if (typeof value === 'object' && value !== null) {
                        simplified[key] = '[Object]';
                    } else {
                        simplified[key] = value;
                    }
                    count++;
                }
            }

            return simplified;
        } catch {
            return '[Could not simplify]';
        }
    }

    private getDefaultAction(method: string, path: string): string {
        const pathSegments = path?.split('/').filter(Boolean) || [];
        const lastSegment = pathSegments[pathSegments.length - 1];

        switch (method) {
            case 'POST':
                if (lastSegment === 'login') return 'LOGIN';
                if (lastSegment === 'register') return 'REGISTER';
                if (lastSegment === 'logout') return 'LOGOUT';
                if (lastSegment === 'reset-password') return 'RESET_PASSWORD';
                if (lastSegment === 'change-password') return 'CHANGE_PASSWORD';
                if (lastSegment === 'toggle-status') return 'TOGGLE_STATUS';
                return 'CREATE';
            case 'PUT':
            case 'PATCH':
                if (lastSegment === 'toggle-status') return 'TOGGLE_STATUS';
                if (lastSegment === 'change-password') return 'CHANGE_PASSWORD';
                return 'UPDATE';
            case 'DELETE':
                return 'DELETE';
            case 'GET':
                return 'VIEW';
            default:
                return method.toUpperCase();
        }
    }

    private getModuleFromPath(path: string): string {
        const pathSegments = path?.split('/').filter(Boolean) || [];
        if (pathSegments.length > 0) {
            return pathSegments[0].toUpperCase().replace('-', '_');
        }
        return 'UNKNOWN';
    }
}
