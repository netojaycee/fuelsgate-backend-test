import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogController } from './controllers/audit-log.controller';
import { AuditLogService } from './services/audit-log.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AuditLog.name, schema: AuditLogSchema },
        ]),
    ],
    controllers: [AuditLogController],
    providers: [AuditLogService, AuditLogRepository],
    exports: [AuditLogService],
})
export class AuditLogModule { }
