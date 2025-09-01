import { Injectable } from '@nestjs/common';
import { IUser, IUserWithRole } from '../dto/user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../entities/user.entity';
import { UserRoleDto } from 'src/modules/role/dto/user_role.dto';
import { UserRole } from 'src/modules/role/entities/user-role.entities';
import { Transporter } from 'src/modules/transporter/entities/transporter.entity';
import { Seller } from 'src/modules/seller/entities/seller.entity';

export interface IUserModel extends Omit<IUser, '_id'>, Document {
  _id?: Types.ObjectId;
}

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserRole.name) private userRoleModel: Model<UserRole>,
    @InjectModel(Transporter.name) private transporterModel: Model<Transporter>,
    @InjectModel(Seller.name) private sellerModel: Model<Seller>,
  ) { }

  async create(createUserDto: IUserWithRole, options?: { session?: any }) {
    if (options && options.session) {
      return await new this.userModel(createUserDto).save({ session: options.session });
    }
    return await new this.userModel(createUserDto).save();
  }

  async createUserRole(UserRoleDto: UserRoleDto, options?: { session?: any }) {
    if (options && options.session) {
      return await new this.userRoleModel(UserRoleDto).save({ session: options.session });
    }
    return await new this.userRoleModel(UserRoleDto).save();
  }

  async findAll(
    searchFilter: unknown,
    offset?: number,
    limit?: number,
  ): Promise<any> {
    const users = await this.userModel.find(searchFilter).skip(offset).limit(limit).lean();

    // Enhance users with profile information (phoneNumber) only for transporter/seller profiles
    const usersWithProfiles = await Promise.all(
      users.map(async (user) => {
        let profilePhoneNumber: string | null = null;
        let hasProfile = false;

        // Check if user has a transporter profile
        const transporterProfile = await this.transporterModel
          .findOne({ userId: user._id })
          .select('phoneNumber')
          .lean();

        if (transporterProfile) {
          profilePhoneNumber = transporterProfile.phoneNumber;
          hasProfile = true;
        } else {
          // Check if user has a seller profile
          const sellerProfile = await this.sellerModel
            .findOne({ userId: user._id })
            .select('phoneNumber')
            .lean();

          if (sellerProfile) {
            profilePhoneNumber = sellerProfile.phoneNumber;
            hasProfile = true;
          }
        }

        // Only include phoneNumber if user has a transporter or seller profile
        if (hasProfile) {
          return {
            ...user,
            phoneNumber: profilePhoneNumber,
          };
        } else {
          // Return user without phoneNumber field for admin/buyer users
          return {
            ...user,
          };
        }
      })
    );

    return usersWithProfiles;
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
