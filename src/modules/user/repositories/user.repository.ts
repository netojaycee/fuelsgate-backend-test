import { Injectable } from '@nestjs/common';
import { IUser, IUserWithRole } from '../dto/user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../entities/user.entity';
import { UserRoleDto } from 'src/modules/role/dto/user_role.dto';
import { UserRole } from 'src/modules/role/entities/user-role.entities';

export interface IUserModel extends Omit<IUser, '_id'>, Document {
  _id?: Types.ObjectId;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserRole.name) private userRoleModel: Model<UserRole>,
  ) {}

  async create(createUserDto: IUserWithRole) {
    return await new this.userModel(createUserDto).save();
  }

  async createUserRole(UserRoleDto: UserRoleDto) {
    return await new this.userRoleModel(UserRoleDto).save();
  }

  async findAll(
    searchFilter: unknown,
    offset?: number,
    limit?: number,
  ): Promise<any> {
    return await this.userModel.find(searchFilter).skip(offset).limit(limit);
  }

  async getTotalUsers(searchFilter: unknown) {
    return await this.userModel.countDocuments(searchFilter);
  }

  async findOne(id: string | Types.ObjectId): Promise<IUserModel | undefined> {
    return await this.userModel.findById(id);
  }

  async findQueryWithPassword(query: any) {
    return await this.userModel.findOne(query).select('+password');
  }

  async findOneQuery(query: any): Promise<IUserModel | undefined> {
    const user = await this.userModel
      .findOne(query)
      .select('+password')
      .lean()
      .exec();

    if (!user) {
      return undefined;
    }

    return user as unknown as IUserModel;
  }

  async update(
    id: string,
    updateUserDto: IUser,
  ): Promise<IUserModel | undefined> {
    return await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
    });
  }

  async updateOneQuery(
    query: any,
    updateUserDto: Partial<IUser>,
  ): Promise<IUserModel | undefined> {
    return await this.userModel.findOneAndUpdate(query, updateUserDto, {
      new: true,
    });
  }

  async remove(id: string): Promise<void> {
    return await this.userModel.findByIdAndDelete(id);
  }
}
