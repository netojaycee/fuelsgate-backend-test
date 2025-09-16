import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DepotHub } from '../entities/depot-hub.entity';
import { DepotHubDto } from '../dto/depot-hub.dto';
import { MongoServerError } from 'mongodb';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class DepotHubRepository {
  constructor(
    @InjectModel(DepotHub.name)
    private depotHubModel: Model<DepotHub>,
  ) {}

  async findAll() {
    return this.depotHubModel.find();
  }

  async getTotal(searchFilter: unknown) {
    return await this.depotHubModel.countDocuments(searchFilter);
  }

  async create(payload: DepotHubDto) {
    try {
      return await new this.depotHubModel(payload).save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('DepotHub already exists.');
      }
      throw error;
    }
  }

  async findOne(depotHubId: string | Types.ObjectId) {
    if (!isValidObjectId(depotHubId)) return null;
    return await this.depotHubModel.findById(depotHubId).exec();
  }

  async update(depotHubId: string, depotHubData: DepotHubDto) {
    try {
      console.log(depotHubId, depotHubData)
      const updatedDepotHub = await this.depotHubModel.findByIdAndUpdate(
        depotHubId,
        depotHubData,
        { new: true, runValidators: true },
      );

      if (!updatedDepotHub) {
        throw new NotFoundException(
          `DepotHub with ID ${depotHubId} not found.`,
        );
      }

      return updatedDepotHub;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('DepotHub already exists.');
      }
      throw error;
    }
  }

  async delete(depotHubId: string) {
    if (!isValidObjectId(depotHubId)) return null;
    const depotHub = await this.depotHubModel.findByIdAndDelete(depotHubId);
    return depotHub;
  }
}
