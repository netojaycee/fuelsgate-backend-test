import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../entities/role.entities';
import { RoleDto, RoleType } from '../dto/role.dto';

@Injectable()
export class RoleRepository {
  constructor(@InjectModel(Role.name) private roleModel: Model<Role>) {}
  async findAll() {
    return await this.roleModel.find();
  }

  async findOne(id: Types.ObjectId): Promise<RoleDto | undefined> {
    const role = await this.roleModel.findById(id);
    return role as unknown as RoleDto;
  }

  async findRoleByName(name: RoleType): Promise<RoleDto | undefined> {
    console.log('pizza name', name);
    return this.roleModel.findOne({ name }).exec() as unknown as Promise<
      RoleDto | undefined
    >;
  }
}
