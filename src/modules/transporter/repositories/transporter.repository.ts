import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Transporter } from '../entities/transporter.entity';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { TransporterDto } from '../dto/transporter.dto';
import { MongoServerError } from 'mongodb';

@Injectable()
export class TransporterRepository {
  constructor(
    @InjectModel(Transporter.name)
    private transporterModel: Model<Transporter>,
  ) { }

  async create(payload: TransporterDto) {
    try {
      return await new this.transporterModel(payload).save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException(
          'Transporter with this userId already exists.',
        );
      }
      throw error;
    }
  }

  async findOne(transporterId: Types.ObjectId | string) {
    if (!isValidObjectId(transporterId)) return null
    return await this.transporterModel.findById(transporterId).exec();
  }


  async findOneQuery(query: Partial<TransporterDto>) {
    if (query?.userId && Types.ObjectId.isValid(query.userId)) {
      query.userId = new Types.ObjectId(query.userId);
    }
    const t = await this.transporterModel.findOne(query).populate('state');

    return t;
  }

  async updateQuery(query: Partial<TransporterDto>, updatedData: Partial<TransporterDto>) {
    const result = await this.transporterModel.findOneAndUpdate(query, updatedData, {
      new: true,
      runValidators: true,
    }).exec();

    if (!result) {
      throw new NotFoundException('Transporter not found with the given query.');
    }
    return result.populate('state');
  }
}
