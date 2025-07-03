import { Injectable, OnModuleInit } from '@nestjs/common';
import { PlatformConfigRepository } from '../repositories/platform-config.repository';

@Injectable()
export class PlatformConfigSeedService implements OnModuleInit {
    // Default service fee percentages
    private readonly DEFAULT_TRANSPORTER_FEE = 5; // 5%
    private readonly DEFAULT_TRADER_FEE = 3; // 3%

    // Config keys
    private readonly TRANSPORTER_FEE_KEY = 'transporter_service_fee_percentage';
    private readonly TRADER_FEE_KEY = 'trader_service_fee_percentage';

    constructor(private platformConfigRepository: PlatformConfigRepository) { }

    async onModuleInit() {
        await this.seedDefaultConfigs();
    }

    async seedDefaultConfigs(): Promise<void> {
        const defaultConfigs = [
            {
                key: this.TRANSPORTER_FEE_KEY,
                value: this.DEFAULT_TRANSPORTER_FEE,
                description: 'Service fee percentage charged to transporters'
            },
            {
                key: this.TRADER_FEE_KEY,
                value: this.DEFAULT_TRADER_FEE,
                description: 'Service fee percentage charged to traders (buyers/sellers)'
            }
        ];

        await this.platformConfigRepository.bulkUpsert(defaultConfigs);
        console.log('Default platform configurations seeded');
    }
}
