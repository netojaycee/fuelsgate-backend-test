import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../entities/user-role.entities';
import { UserRoleDto } from '../dto/user_role.dto';

@Injectable()
export class UserRoleRepository {
  constructor(
    @InjectModel(UserRole.name) private userRoleModel: Model<UserRole>,
  ) {}

  async findAll() {
    return await this.userRoleModel.find();
  }

  async findOneQuery(query: Record<string, any>): Promise<UserRoleDto> {
    const formattedQuery = {
      userId: new Types.ObjectId(query.userId),
    };
    return await this.userRoleModel.findOne(formattedQuery).exec();
  }

  async findRoleByName(name: string) {
    return await this.userRoleModel.findOne({ name }).exec();
  }
}
