import { ConflictException, Injectable } from '@nestjs/common';
import { Buyer } from '../entities/buyer.entity';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { BuyerDto } from '../dto/buyer.dto';
import { MongoServerError } from 'mongodb';

@Injectable()
export class BuyerRepository {
  constructor(
    @InjectModel(Buyer.name)
    private buyerModel: Model<Buyer>,
  ) { }

  async create(payload: BuyerDto) {
    try {
      return await new this.buyerModel(payload).save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Buyer with this userId already exists.');
      }
      throw error;
    }
  }

  async findOne(buyerId: Types.ObjectId | string) {
    if (!isValidObjectId(buyerId)) return null
    return await this.buyerModel.findById(buyerId).exec();
  }

  async findOneQuery(query: unknown) {
    return await this.buyerModel.findOne(query).exec();
  }
}
