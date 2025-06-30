import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { Admin } from '../entities/admin.entity';
import { Role } from 'src/modules/role/entities/role.entities';
import { UserRole } from 'src/modules/role/entities/user-role.entities';
import { User } from 'src/modules/user/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import { RoleType } from 'src/modules/role/dto/role.dto';
// import { AdminDto } from '../dto/admin.dto';

@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectModel('Admin') private readonly adminModel: Model<Admin>,
    @InjectModel('Role') private readonly roleModel: Model<Role>,
    @InjectModel('UserRole') private readonly userRoleModel: Model<UserRole>,
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly userService: UserService,
  ) { }

  private readonly ADMIN = {
    firstName: 'Admin',
    lastName: 'Admin',
    email: 'admin@fuelsgate.com',
    password: 'admin@password',
    role: 'admin' as RoleType,
    status: 'active',
    lastSeen: new Date(),
  };

  async seedAdminData() {
    const existingAdmins = await this.adminModel.find({});
    const adminRole = await this.roleModel.findOne({ name: 'admin' });
    const adminUsers = await this.userRoleModel.find({ roleId: adminRole._id });

    if (existingAdmins.length < 1 && adminUsers.length < 1) {
      await this.adminModel.deleteMany({});
      const usersToDelete = await this.userRoleModel.find({ roleId: adminRole._id });

      if (usersToDelete.length > 0) {
        const userIds = usersToDelete.map((user) => user.userId);
        await this.userRoleModel.deleteMany({ roleId: adminRole._id });
        await this.userModel.deleteMany({ _id: { $in: userIds } });
      }

      const admin = await this.userService.createNew({
        ...this.ADMIN
      }, false);

      await this.adminModel.create({
        userId: admin._id,
        category: 'superadmin',
      });

      this.logger.log('Admin seeded successfully');
    } else {
      this.logger.log('Admin already exist. Seeding skipped.');
    }
  }
}
