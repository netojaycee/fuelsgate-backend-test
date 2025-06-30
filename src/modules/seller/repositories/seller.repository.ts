import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Seller } from '../entities/seller.entity';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { SellerDto } from '../dto/seller.dto';
import { MongoServerError } from 'mongodb';

@Injectable()
export class SellerRepository {
  constructor(
    @InjectModel(Seller.name)
    private sellerModel: Model<Seller>,
  ) { }

  async create(payload: SellerDto) {
    try {
      return await new this.sellerModel(payload).save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Seller with this userId already exists.');
      }
      throw error;
    }
  }

  async findOne(sellerId: Types.ObjectId | string) {
    if (!isValidObjectId(sellerId)) return null
    return await this.sellerModel.findById(sellerId).exec();
  }

  async findOneQuery(query: Partial<SellerDto>) {
    if (query?.userId && Types.ObjectId.isValid(query.userId)) {
      query.userId = new Types.ObjectId(query.userId);
    }
    const s = await this.sellerModel.findOne(query).exec();
    return s
  }

  async updateQuery(query: Partial<SellerDto>, updatedData: Partial<SellerDto>) {
    const result = await this.sellerModel.findOneAndUpdate(query, updatedData, {
      new: true,
      runValidators: true,
    }).exec();

    if (!result) {
      throw new NotFoundException('Seller not found with the given query.');
    }
    return result;
  }
}

