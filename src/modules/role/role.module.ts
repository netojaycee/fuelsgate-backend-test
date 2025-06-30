import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleSeedService } from './seeders/role.seeder';
import { Role, RoleSchema } from './entities/role.entities';
import { RoleRepository } from './repositories/role.repository';
import { RoleService } from './service/role.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
  ],
  providers: [RoleSeedService, RoleService, RoleRepository],
  exports: [RoleSeedService, RoleService, RoleRepository],
})
export class RoleSeedModule { }
