import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { RoleRepository } from '../role/repositories/role.repository';
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';
import { Role, RoleSchema } from '../role/entities/role.entities';
import { UserRoleRepository } from '../role/repositories/user-role.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, RoleRepository, UserRoleRepository],
})
export class UserModule {}
