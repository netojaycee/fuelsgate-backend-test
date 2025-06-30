import {
    Controller,
    Get,
    Query,
    Param,
    Response,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogQueryDto } from '../dto/audit-log.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) { }

    @Get()
    async findAll(
        @Query() query: AuditLogQueryDto,
        @Response() res,
    ) {
        const data = await this.auditLogService.findAll(query);
        return res.status(200).json({
            message: 'Audit logs fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Get('statistics')
    async getStatistics(@Response() res) {
        const data = await this.auditLogService.getStatistics();
        return res.status(200).json({
            message: 'Audit log statistics fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Get('user/:userId')
    async findByUserId(
        @Param('userId') userId: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Response() res,
    ) {
        const data = await this.auditLogService.findByUserId(userId, page, limit);
        return res.status(200).json({
            message: 'User audit logs fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Response() res) {
        const data = await this.auditLogService.findOne(id);
        return res.status(200).json({
            message: 'Audit log fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Delete('cleanup/:days')
    async deleteOldLogs(
        @Param('days') days: number,
        @Response() res,
    ) {
        const data = await this.auditLogService.deleteOldLogs(days);
        return res.status(200).json({
            message: `Audit logs older than ${days} days deleted successfully`,
            data,
            statusCode: 200,
        });
    }
}
