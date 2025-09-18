import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
    Query,
    Response,
    UseGuards,
} from '@nestjs/common';
import { PlatformConfigService } from '../services/platform-config.service';
import {
    CreatePlatformConfigDto,
    PlatformConfigQueryDto,
    UpdatePlatformConfigDto
} from '../dto/platform-config.dto';
import { AuditLog } from 'src/shared/decorators/audit-log.decorator';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';
import {
    createPlatformConfigSchema,
    updatePlatformConfigSchema
} from '../validations/platform-config.validation';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';

@Controller('platform-config')
export class PlatformConfigController {
    constructor(private readonly platformConfigService: PlatformConfigService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @AuditLog({ action: 'CREATE_PLATFORM_CONFIG', module: 'PLATFORM_CONFIG' })
    async createConfig(
        @Body(new YupValidationPipe(createPlatformConfigSchema)) body: CreatePlatformConfigDto,
        @Response() res,
    ) {
        const data = await this.platformConfigService.create(body);
        return res.status(201).json({
            message: 'Configuration created successfully',
            data,
            statusCode: 201,
        });
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getAllConfigs(
        @Query() query: PlatformConfigQueryDto,
        @Response() res,
    ) {
        const data = await this.platformConfigService.findAll(query);
        return res.status(200).json({
            message: 'Configurations fetched successfully',
            ...data,
            statusCode: 200,
        });
    }

    @Get(':key')
    @UseGuards(JwtAuthGuard)
    async getConfig(
        @Param('key') key: string,
        @Response() res,
    ) {
        const data = await this.platformConfigService.findOne(key);
        return res.status(200).json({
            message: 'Configuration fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Put(':key')
    @UseGuards(JwtAuthGuard)
    @AuditLog({ action: 'UPDATE_PLATFORM_CONFIG', module: 'PLATFORM_CONFIG' })
    async updateConfig(
        @Param('key') key: string,
        @Body(new YupValidationPipe(updatePlatformConfigSchema)) body: UpdatePlatformConfigDto,
        @Response() res,
    ) {
        const data = await this.platformConfigService.update(key, body);
        return res.status(200).json({
            message: 'Configuration updated successfully',
            data,
            statusCode: 200,
        });
    }

    @Delete(':key')
    @UseGuards(JwtAuthGuard)
    @AuditLog({ action: 'DELETE_PLATFORM_CONFIG', module: 'PLATFORM_CONFIG' })
    async deleteConfig(
        @Param('key') key: string,
        @Response() res,
    ) {
        const data = await this.platformConfigService.delete(key);
        return res.status(200).json({
            message: 'Configuration deleted successfully',
            data,
            statusCode: 200,
        });
    }

    @Get('service/fees')
    @UseGuards(JwtAuthGuard)
    async getServiceFees(@Response() res) {
        const data = await this.platformConfigService.getServiceFees();
        return res.status(200).json({
            message: 'Service fees fetched successfully',
            data,
            statusCode: 200,
        });
    }

    @Put('service/fees')
    @UseGuards(JwtAuthGuard)
    @AuditLog({ action: 'UPDATE_SERVICE_FEES', module: 'PLATFORM_CONFIG' })
    async updateServiceFees(
        @Body() body: { transporterServiceFee: number, traderServiceFee: number, traderServiceFeeLoaded: number, transporterServiceFeeLoaded: number },
        @Response() res,
    ) {
        const { transporterServiceFee, traderServiceFee, traderServiceFeeLoaded, transporterServiceFeeLoaded } = body;
        const data = await this.platformConfigService.updateServiceFees(transporterServiceFee, traderServiceFee, traderServiceFeeLoaded, transporterServiceFeeLoaded);
        return res.status(200).json({
            message: 'Service fees updated successfully',
            data,
            statusCode: 200,
        });
    }
}
