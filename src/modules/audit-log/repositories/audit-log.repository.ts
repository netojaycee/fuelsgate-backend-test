import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../entities/audit-log.entity';
import { CreateAuditLogDto } from '../dto/audit-log.dto';

@Injectable()
export class AuditLogRepository {
    constructor(
        @InjectModel(AuditLog.name)
        private auditLogModel: Model<AuditLogDocument>,
    ) { }

    async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLogDocument> {
        const createdLog = new this.auditLogModel(createAuditLogDto);
        return createdLog.save();
    }

    async findAll(
        filter: any = {},
        offset: number = 0,
        limit: number = 10,
        sortBy: string = 'createdAt',
        sortOrder: 'asc' | 'desc' = 'desc',
    ): Promise<AuditLogDocument[]> {
        const sort = { [sortBy]: sortOrder };

        return this.auditLogModel
            .find(filter)
            .sort(sort)
            .skip(offset)
            .limit(limit)
            .populate('userId', 'firstName lastName email')
            .exec();
    }

    async findOne(id: string): Promise<AuditLogDocument> {
        return this.auditLogModel
            .findById(id)
            .populate('userId', 'firstName lastName email')
            .exec();
    }

    async getTotalCount(filter: any = {}): Promise<number> {
        return this.auditLogModel.countDocuments(filter);
    }

    async findByUserId(
        userId: string,
        offset: number = 0,
        limit: number = 10,
    ): Promise<AuditLogDocument[]> {
        return this.auditLogModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .exec();
    }

    async findByModule(
        module: string,
        offset: number = 0,
        limit: number = 10,
    ): Promise<AuditLogDocument[]> {
        return this.auditLogModel
            .find({ module })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .populate('userId', 'firstName lastName email')
            .exec();
    }

    async findByAction(
        action: string,
        offset: number = 0,
        limit: number = 10,
    ): Promise<AuditLogDocument[]> {
        return this.auditLogModel
            .find({ action })
            .sort({ createdAt: -1 })
            .skip(offset)
            .limit(limit)
            .populate('userId', 'firstName lastName email')
            .exec();
    }

    async getLogStatistics(): Promise<any> {
        const totalLogs = await this.auditLogModel.countDocuments();
        const successLogs = await this.auditLogModel.countDocuments({ status: 'SUCCESS' });
        const failedLogs = await this.auditLogModel.countDocuments({ status: 'FAILED' });
        const errorLogs = await this.auditLogModel.countDocuments({ status: 'ERROR' });

        const moduleStats = await this.auditLogModel.aggregate([
            {
                $group: {
                    _id: '$module',
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        const actionStats = await this.auditLogModel.aggregate([
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        return {
            totalLogs,
            successLogs,
            failedLogs,
            errorLogs,
            moduleStats,
            actionStats,
        };
    }

    async deleteOldLogs(daysOld: number = 90): Promise<{ deletedCount: number }> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.auditLogModel.deleteMany({
            createdAt: { $lt: cutoffDate },
        });

        return { deletedCount: result.deletedCount };
    }
}
