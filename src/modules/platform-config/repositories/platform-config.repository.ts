import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlatformConfig, PlatformConfigDocument } from '../entities/platform-config.entity';
import { CreatePlatformConfigDto, UpdatePlatformConfigDto } from '../dto/platform-config.dto';

@Injectable()
export class PlatformConfigRepository {
    constructor(
        @InjectModel(PlatformConfig.name) private platformConfigModel: Model<PlatformConfigDocument>,
    ) { }

    async create(configData: CreatePlatformConfigDto): Promise<PlatformConfig> {
        const config = new this.platformConfigModel(configData);
        return config.save();
    }

    async findOne(key: string): Promise<PlatformConfig | null> {
        return this.platformConfigModel.findOne({ key, isDeleted: false }).exec();
    }

    async findById(id: string): Promise<PlatformConfig | null> {
        return this.platformConfigModel.findById(id).exec();
    }

    async findAll(filter: any = {}, offset: number = 0, limit: number = 10): Promise<PlatformConfig[]> {
        return this.platformConfigModel
            .find({ ...filter, isDeleted: false })
            .sort({ key: 1 })
            .skip(offset)
            .limit(limit)
            .exec();
    }

    async getTotal(filter: any = {}): Promise<number> {
        return this.platformConfigModel.countDocuments({ ...filter, isDeleted: false }).exec();
    }

    async update(key: string, updateData: UpdatePlatformConfigDto): Promise<PlatformConfig | null> {
        return this.platformConfigModel
            .findOneAndUpdate({ key, isDeleted: false }, updateData, { new: true })
            .exec();
    }

    async delete(key: string): Promise<PlatformConfig | null> {
        return this.platformConfigModel
            .findOneAndUpdate({ key }, { isDeleted: true }, { new: true })
            .exec();
    }

    async bulkUpsert(configs: CreatePlatformConfigDto[]): Promise<void> {
        const bulkOps = configs.map(config => ({
            updateOne: {
                filter: { key: config.key },
                update: { $set: config },
                upsert: true
            }
        }));

        await this.platformConfigModel.bulkWrite(bulkOps);
    }
}
