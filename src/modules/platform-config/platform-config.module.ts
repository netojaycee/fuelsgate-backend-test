import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformConfigController } from './controllers/platform-config.controller';
import { PlatformConfigService } from './services/platform-config.service';
import { PlatformConfigRepository } from './repositories/platform-config.repository';
import { PlatformConfig, PlatformConfigSchema } from './entities/platform-config.entity';
// import { PlatformConfigSeedService } from './seeders/platform-config.seeder';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: PlatformConfig.name, schema: PlatformConfigSchema },
        ]),
    ],
    controllers: [PlatformConfigController],
    providers: [
        PlatformConfigService,
        PlatformConfigRepository,
        // PlatformConfigSeedService,
    ],
    exports: [PlatformConfigService, PlatformConfigRepository],
})
export class PlatformConfigModule { }
