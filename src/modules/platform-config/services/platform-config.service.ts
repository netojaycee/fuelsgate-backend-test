import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException
} from '@nestjs/common';
import { PlatformConfigRepository } from '../repositories/platform-config.repository';
import {
    CreatePlatformConfigDto,
    UpdatePlatformConfigDto,
    PlatformConfigQueryDto,
    ServiceFeeConfig
} from '../dto/platform-config.dto';

@Injectable()
export class PlatformConfigService {
    // Default service fee percentages if not set
    // private readonly DEFAULT_TRANSPORTER_FEE = 5; // 5%
    // private readonly DEFAULT_TRADER_FEE = 3; // 3%

    // Config keys
    private readonly TRANSPORTER_FEE_KEY = 'transporter_service_fee_percentage';
    private readonly TRADER_FEE_KEY = 'trader_service_fee_percentage';
    private readonly TRADER_FEE_KEY_LOADED = 'trader_service_fee_percentage_loaded';
    private readonly TRANSPORTER_FEE_KEY_LOADED = 'transporter_service_fee_percentage_loaded';
    
    constructor(private platformConfigRepository: PlatformConfigRepository) {
        // Initialize default values if they don't exist
        // this.initializeDefaultConfigs();
    }

    // private async initializeDefaultConfigs(): Promise<void> {
    //     const defaultConfigs = [
    //         {
    //             key: this.TRANSPORTER_FEE_KEY,
    //             value: this.DEFAULT_TRANSPORTER_FEE,
    //             description: 'Service fee percentage charged to transporters'
    //         },
    //         {
    //             key: this.TRADER_FEE_KEY,
    //             value: this.DEFAULT_TRADER_FEE,
    //             description: 'Service fee percentage charged to traders (buyers/sellers)'
    //         }
    //     ];

    //     await this.platformConfigRepository.bulkUpsert(defaultConfigs);
    // }

    async create(createDto: CreatePlatformConfigDto): Promise<any> {
        const existingConfig = await this.platformConfigRepository.findOne(createDto.key);
        if (existingConfig) {
            throw new ConflictException(`Configuration with key '${createDto.key}' already exists`);
        }

        return this.platformConfigRepository.create(createDto);
    }

    async findAll(query: PlatformConfigQueryDto): Promise<{ data: any[], total: number, page: number, limit: number }> {
        const { page = '1', limit = '10', key } = query;
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const offset = (pageNumber - 1) * limitNumber;

        const filter: any = {};
        if (key) {
            filter.key = { $regex: key, $options: 'i' };
        }

        const [configs, total] = await Promise.all([
            this.platformConfigRepository.findAll(filter, offset, limitNumber),
            this.platformConfigRepository.getTotal(filter)
        ]);

        return {
            data: configs,
            total,
            page: pageNumber,
            limit: limitNumber,
        };
    }

    async findOne(key: string): Promise<any> {
        const config = await this.platformConfigRepository.findOne(key);
        if (!config) {
            throw new NotFoundException(`Configuration with key '${key}' not found`);
        }
        return config;
    }

    async update(key: string, updateDto: UpdatePlatformConfigDto): Promise<any> {
        const existingConfig = await this.platformConfigRepository.findOne(key);
        if (!existingConfig) {
            throw new NotFoundException(`Configuration with key '${key}' not found`);
        }

        return this.platformConfigRepository.update(key, updateDto);
    }

    async delete(key: string): Promise<any> {
        const existingConfig = await this.platformConfigRepository.findOne(key);
        if (!existingConfig) {
            throw new NotFoundException(`Configuration with key '${key}' not found`);
        }

        return this.platformConfigRepository.delete(key);
    }

    async getServiceFees(): Promise<ServiceFeeConfig> {
        try {
            const [transporterFee, traderFee, traderFeeLoaded, transporterFeeLoaded] = await Promise.all([
                this.platformConfigRepository.findOne(this.TRANSPORTER_FEE_KEY),
                this.platformConfigRepository.findOne(this.TRADER_FEE_KEY),
                this.platformConfigRepository.findOne(this.TRADER_FEE_KEY_LOADED),
                this.platformConfigRepository.findOne(this.TRANSPORTER_FEE_KEY_LOADED)
            ]);

            return {
                transporterServiceFee: transporterFee?.value,
                traderServiceFee: traderFee?.value,
                traderServiceFeeLoaded: traderFeeLoaded?.value,
                transporterServiceFeeLoaded: transporterFeeLoaded?.value

            };
        } catch (error) {
            console.error('Error fetching service fees:', error);
            // Return default values if there's an error
            // return {
            //     transporterServiceFee: this.DEFAULT_TRANSPORTER_FEE,
            //     traderServiceFee: this.DEFAULT_TRADER_FEE
            // };
        }
    }

    async updateServiceFees(transporterFee: number, traderFee: number, traderFeeLoaded: number, transporterFeeLoaded: number): Promise<ServiceFeeConfig> {
        if (transporterFee < 0 || transporterFee > 100 || traderFee < 0 || traderFee > 100 || traderFeeLoaded < 0 || traderFeeLoaded > 100 || transporterFeeLoaded < 0 || transporterFeeLoaded > 100) {
            throw new BadRequestException('Fee percentages must be between 0 and 100');
        }

        await Promise.all([
            this.platformConfigRepository.update(this.TRANSPORTER_FEE_KEY, {
                value: transporterFee,
                description: 'Service fee percentage charged to transporters'
            }),
            this.platformConfigRepository.update(this.TRADER_FEE_KEY, {
                value: traderFee,
                description: 'Service fee percentage charged to traders (buyers/sellers)'
            }),
            this.platformConfigRepository.update(this.TRADER_FEE_KEY_LOADED, {
                value: traderFeeLoaded,
                description: 'Service fee percentage charged to traders for loaded orders'
            }),
            this.platformConfigRepository.update(this.TRANSPORTER_FEE_KEY, {
                value: transporterFeeLoaded,
                description: 'Service fee percentage charged to transporters for loaded orders'
            })
        ]);

        return {
            transporterServiceFee: transporterFee,
            traderServiceFee: traderFee,
            traderServiceFeeLoaded: traderFeeLoaded,
            transporterServiceFeeLoaded: transporterFeeLoaded
        };
    }
}
