import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pricing } from '../entities/pricing.entity';
import { PricingDto } from '../dto/pricing.dto';
import { MongoServerError } from 'mongodb';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class PricingRepository {
  constructor(
    @InjectModel(Pricing.name)
    private pricingModel: Model<Pricing>,
  ) {}

  async findAll(offset?: number, limit?: number) {
    return await this.pricingModel
      .find()
      .skip(offset)
      .limit(limit)
      .populate('productId')
      .populate('depotHubId', 'name');
  }

  async getTotalpricings() {
    return await this.pricingModel.countDocuments();
  }

  async create(payload: PricingDto) {
    try {
      return await new this.pricingModel(payload).save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('pricing with this userId already exists.');
      }
      throw error;
    }
  }

  async findOne(pricingId: string | Types.ObjectId) {
    if (!isValidObjectId(pricingId)) return null;
    return await this.pricingModel.findById(pricingId).exec();
  }

  async findOneByValue(value: string) {
    return await this.pricingModel.findOne({ value }).exec();
  }

  async update(pricingId: string, pricingData: Partial<PricingDto>) {
    try {
      const updatedpricing = await this.pricingModel.findByIdAndUpdate(
        pricingId,
        pricingData,
        { new: true, runValidators: true },
      );

      if (!updatedpricing) {
        throw new NotFoundException(`pricing with ID ${pricingId} not found.`);
      }

      return updatedpricing;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('pricing already exists.');
      }
      throw error;
    }
  }

  async delete(pricingId: string) {
    if (!isValidObjectId(pricingId)) return null;
    const pricing = await this.pricingModel.findByIdAndDelete(pricingId);
    return pricing;
  }
}
