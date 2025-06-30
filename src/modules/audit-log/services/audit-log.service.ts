import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { CreateAuditLogDto, AuditLogQueryDto } from '../dto/audit-log.dto';
import { AuditLogDocument } from '../entities/audit-log.entity';
import * as geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class AuditLogService {
    constructor(private readonly auditLogRepository: AuditLogRepository) { }

    async createLog(createAuditLogDto: CreateAuditLogDto): Promise<AuditLogDocument> {
        try {
            // Parse user agent if provided
            if (createAuditLogDto.userAgent) {
                const parser = new UAParser(createAuditLogDto.userAgent);
                const result = parser.getResult();

                createAuditLogDto.browser = `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim();
                createAuditLogDto.os = `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim();
                createAuditLogDto.device = result.device.type || 'desktop';
            }

            // Get location from IP if provided
            if (createAuditLogDto.ipAddress && createAuditLogDto.ipAddress !== 'unknown') {
                const geo = geoip.lookup(createAuditLogDto.ipAddress);
                if (geo) {
                    createAuditLogDto.location = {
                        country: geo.country,
                        region: geo.region,
                        city: geo.city,
                        timezone: geo.timezone,
                    };
                }
            }

            // Sanitize sensitive data and prevent circular references
            const sanitizedData = this.sanitizeData(createAuditLogDto);

            // Additional safety: Convert to JSON and back to remove any remaining circular references
            const safeData = this.createSafeDataCopy(sanitizedData);

            return await this.auditLogRepository.create(safeData);
        } catch (error) {
            console.error('Error creating audit log:', error);

            // Fallback: Create minimal log entry
            try {
                const minimalLog = {
                    userId: createAuditLogDto.userId,
                    userEmail: createAuditLogDto.userEmail || 'unknown',
                    userName: createAuditLogDto.userName || 'unknown',
                    action: createAuditLogDto.action,
                    module: createAuditLogDto.module,
                    method: createAuditLogDto.method,
                    endpoint: createAuditLogDto.endpoint,
                    status: createAuditLogDto.status,
                    errorMessage: 'Failed to create detailed log: ' + error.message,
                    ipAddress: createAuditLogDto.ipAddress,
                };

                return await this.auditLogRepository.create(minimalLog);
            } catch (fallbackError) {
                console.error('Failed to create even minimal audit log:', fallbackError);
                throw fallbackError;
            }
        }
    }

    async findAll(query: AuditLogQueryDto) {
        const {
            page = 1,
            limit = 20,
            search,
            module,
            action,
            status,
            userId,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;

        let offset = 0;
        if (page && page > 0) {
            offset = (page - 1) * limit;
        }

        // Build filter
        const filter: any = {};

        if (search) {
            filter.$or = [
                { userEmail: { $regex: search, $options: 'i' } },
                { userName: { $regex: search, $options: 'i' } },
                { action: { $regex: search, $options: 'i' } },
                { module: { $regex: search, $options: 'i' } },
                { endpoint: { $regex: search, $options: 'i' } },
            ];
        }

        if (module) {
            filter.module = module;
        }

        if (action) {
            filter.action = action;
        }

        if (status) {
            filter.status = status;
        }

        if (userId) {
            filter.userId = userId;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        const logs = await this.auditLogRepository.findAll(
            filter,
            offset,
            limit,
            sortBy,
            sortOrder,
        );

        const total = await this.auditLogRepository.getTotalCount(filter);

        return {
            logs,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
        };
    }

    async findOne(id: string): Promise<AuditLogDocument> {
        return await this.auditLogRepository.findOne(id);
    }

    async findByUserId(userId: string, page: number = 1, limit: number = 10) {
        const offset = (page - 1) * limit;
        const logs = await this.auditLogRepository.findByUserId(userId, offset, limit);
        const total = await this.auditLogRepository.getTotalCount({ userId });

        return {
            logs,
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getStatistics() {
        return await this.auditLogRepository.getLogStatistics();
    }

    async deleteOldLogs(daysOld: number = 90) {
        return await this.auditLogRepository.deleteOldLogs(daysOld);
    }

    private sanitizeData(data: CreateAuditLogDto): CreateAuditLogDto {
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];

        const sanitized = { ...data };

        // Sanitize request data
        if (sanitized.requestData) {
            sanitized.requestData = this.removeSensitiveFields(sanitized.requestData, sensitiveFields, new Set());
        }

        // Sanitize response data
        if (sanitized.responseData) {
            sanitized.responseData = this.removeSensitiveFields(sanitized.responseData, sensitiveFields, new Set());
        }

        // Sanitize metadata
        if (sanitized.metadata) {
            if (sanitized.metadata.oldValue) {
                sanitized.metadata.oldValue = this.removeSensitiveFields(sanitized.metadata.oldValue, sensitiveFields, new Set());
            }
            if (sanitized.metadata.newValue) {
                sanitized.metadata.newValue = this.removeSensitiveFields(sanitized.metadata.newValue, sensitiveFields, new Set());
            }
        }

        return sanitized;
    }

    private removeSensitiveFields(obj: any, sensitiveFields: string[], visited: Set<any>): any {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        // Prevent circular references
        if (visited.has(obj)) {
            return '[Circular Reference]';
        }

        visited.add(obj);

        try {
            if (Array.isArray(obj)) {
                return obj.map(item => this.removeSensitiveFields(item, sensitiveFields, new Set(visited)));
            }

            const sanitized: any = {};

            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
                        sanitized[key] = '[REDACTED]';
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitized[key] = this.removeSensitiveFields(obj[key], sensitiveFields, new Set(visited));
                    } else {
                        sanitized[key] = obj[key];
                    }
                }
            }

            return sanitized;
        } catch (error) {
            return '[Error processing object]';
        } finally {
            visited.delete(obj);
        }
    }

    // Helper method to extract audit log data from request
    extractAuditData(req: any, action: string, module: string, responseData?: any, metadata?: any) {
        const user = req.user || {};
        const ip = this.getClientIp(req);

        // Safely extract request data
        const requestData = this.safelyExtractRequestData(req);

        // Build userName with fallback logic
        let userName = 'anonymous';
        if (user.firstName && user.lastName) {
            userName = `${user.firstName} ${user.lastName}`;
        } else if (user.firstName) {
            userName = user.firstName;
        } else if (user.lastName) {
            userName = user.lastName;
        } else if (user.email) {
            userName = user.email.split('@')[0]; // Use email username part instead of full email
        }

        return {
            userId: user.id || user._id,
            userEmail: user.email || 'anonymous',
            userName,
            action,
            module,
            method: req.method,
            endpoint: req.route?.path || req.url,
            requestData,
            responseData,
            ipAddress: ip,
            userAgent: req.headers['user-agent'],
            metadata,
        };
    }

    private safelyExtractRequestData(req: any): any {
        try {
            const data: any = {};

            // Safely extract body
            if (req.body && Object.keys(req.body).length > 0) {
                data.body = this.sanitizeForLogging(req.body);
            }

            // Safely extract params
            if (req.params && Object.keys(req.params).length > 0) {
                data.params = req.params;
            }

            // Safely extract query (limit size)
            if (req.query && Object.keys(req.query).length > 0) {
                data.query = this.sanitizeForLogging(req.query);
            }

            return data;
        } catch (error) {
            return { error: 'Failed to extract request data' };
        }
    }

    private sanitizeForLogging(obj: any): any {
        try {
            // First pass: remove sensitive fields
            const sanitized = this.removeSensitiveFields(obj, ['password', 'token', 'secret', 'key', 'auth'], new Set());

            // Second pass: check size and truncate if needed
            const stringified = JSON.stringify(sanitized);
            if (stringified.length > 2000) {
                return this.createSummary(sanitized);
            }

            return sanitized;
        } catch (error) {
            return { message: '[Data could not be processed]', type: typeof obj };
        }
    }

    private createSummary(obj: any): any {
        try {
            if (Array.isArray(obj)) {
                return {
                    type: 'array',
                    length: obj.length,
                    sample: obj.slice(0, 3),
                    truncated: obj.length > 3
                };
            }

            if (typeof obj === 'object' && obj !== null) {
                const keys = Object.keys(obj);
                const summary: any = {
                    type: 'object',
                    keyCount: keys.length,
                    keys: keys.slice(0, 10)
                };

                // Include a few sample values
                for (let i = 0; i < Math.min(5, keys.length); i++) {
                    const key = keys[i];
                    const value = obj[key];
                    if (typeof value !== 'object') {
                        summary[key] = value;
                    } else {
                        summary[key] = `[${typeof value}]`;
                    }
                }

                if (keys.length > 10) {
                    summary.truncatedKeys = keys.length - 10;
                }

                return summary;
            }

            return obj;
        } catch {
            return { message: '[Could not create summary]' };
        }
    }

    private getClientIp(req: any): string {
        return (
            req.headers['x-forwarded-for']?.split(',')[0] ||
            req.headers['x-real-ip'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            req.ip ||
            'unknown'
        );
    }

    private createSafeDataCopy(data: any): any {
        try {
            return JSON.parse(JSON.stringify(data, (key, value) => {
                // Handle different types safely
                if (value === null || value === undefined) {
                    return value;
                }

                if (typeof value === 'function') {
                    return '[Function]';
                }

                if (value instanceof Date) {
                    return value.toISOString();
                }

                if (value instanceof Error) {
                    return {
                        name: value.name,
                        message: value.message,
                        stack: value.stack
                    };
                }

                if (typeof value === 'object') {
                    // Check for circular references by trying to stringify
                    try {
                        const testStringify = JSON.stringify(value);
                        if (testStringify.length > 10000) {
                            return '[Large Object Truncated]';
                        }
                        return value;
                    } catch (circularError) {
                        return '[Circular Reference Detected]';
                    }
                }

                return value;
            }));
        } catch (error) {
            // If JSON serialization fails completely, create a minimal safe copy
            return {
                userId: data.userId,
                userEmail: data.userEmail || 'unknown',
                userName: data.userName || 'unknown',
                action: data.action,
                module: data.module,
                method: data.method,
                endpoint: data.endpoint,
                status: data.status,
                ipAddress: data.ipAddress,
                errorMessage: data.errorMessage || 'Data serialization failed',
                metadata: {
                    originalDataType: typeof data,
                    serializationError: error.message
                }
            };
        }
    }
}
