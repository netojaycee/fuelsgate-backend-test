import { ConflictException, Injectable } from '@nestjs/common';
import { Admin } from '../entities/admin.entity';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { AdminDto } from '../dto/admin.dto';
import { MongoServerError } from 'mongodb';

@Injectable()
export class AdminRepository {
  constructor(
    @InjectModel(Admin.name)
    private adminModel: Model<Admin>,
  ) {}

  async create(payload: AdminDto) {
    try {
      return await new this.adminModel(payload).save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Admin with this userId already exists.');
      }
      throw error;
    }
  }

  async findOne(adminId: Types.ObjectId | string) {
    if (!isValidObjectId(adminId)) return null;
    return await this.adminModel.findById(adminId).exec();
  }

  async findOneQuery(query: Partial<AdminDto>) {
    if (query?.userId && Types.ObjectId.isValid(query.userId)) {
      query.userId = new Types.ObjectId(query.userId);
    }
    return await this.adminModel.findOne(query).exec();
  }
}
