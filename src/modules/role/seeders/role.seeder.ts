import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../entities/role.entities';

@Injectable()
export class RoleSeedService {
  private readonly logger = new Logger(RoleSeedService.name);

  constructor(@InjectModel('Role') private readonly roleModel: Model<Role>) {}

  private readonly seedRoles = [
    { name: 'transporter' },
    { name: 'seller' },
    { name: 'buyer' },
    { name: 'admin' },
  ];

  async seedRolesData() {
    const existingRoles = await this.roleModel.find({});

    if (existingRoles.length < 4) {
      await this.roleModel.deleteMany({});
      await this.roleModel.insertMany(this.seedRoles);
      this.logger.log('Roles seeded successfully');
    } else {
      this.logger.log('Roles already exist. Seeding skipped.');
    }
  }
}
