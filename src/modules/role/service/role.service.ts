import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { RoleRepository } from 'src/modules/role/repositories/role.repository';

@Injectable()
export class RoleService {
  constructor(private readonly roleRepository: RoleRepository) {}

  findOne(id: Types.ObjectId) {
    return this.roleRepository.findOne(id);
  }
}
