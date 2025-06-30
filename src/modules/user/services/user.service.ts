import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  IUser,
  IUserWithRole,
  UpdatePasswordDto,
  UserQueryDto,
  ToggleStatusDto,
} from '../dto/user.dto';
import { IUserModel, UserRepository } from '../repositories/user.repository';
import { RoleRepository } from 'src/modules/role/repositories/role.repository';
import { UserRoleRepository } from 'src/modules/role/repositories/user-role.repository';
import { RoleType } from 'src/modules/role/dto/role.dto';
import { UserRoleDto } from 'src/modules/role/dto/user_role.dto';
import { Types } from 'mongoose';
import { generatePasswordHash } from 'src/utils/helpers';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import * as bcrypt from 'bcrypt';
import { join } from 'path';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly roleRepository: RoleRepository,
    private readonly userRole: UserRoleRepository,
    private readonly mailService: MailerService,
  ) { }

  async createNew(
    createUserDto: IUserWithRole,
    sendEmail: boolean = true,
  ): Promise<IUserWithRole> {
    const userData = { ...createUserDto };
    if (userData.password) {
      userData.password = await generatePasswordHash(userData.password);
    }

    const role = await this.roleRepository.findRoleByName(userData.role);

    if (!role) {
      throw new BadRequestException({
        role: 'Role not found',
      });
    }

    const query = { email: userData.email };
    const isUser = await this.userRepository.findOneQuery(query);
    if (isUser) {
      throw new ConflictException({
        email: 'User Already Exist',
      });
    }

    if (userData.role === 'transporter') {
      userData.status = 'pending';
    }

    const user = await this.userRepository.create(userData);

    if (user) {
      if (!userData.role) {
        return null;
      }

      await this.userRepository.createUserRole({
        userId: user._id,
        roleId: role._id,
      } as UserRoleDto);



      if (sendEmail) {
        this.mailService.sendMail({
          to: `${user.email}`,
          subject: `Welcome to Fuelsgate`,
          template: join(__dirname, '../mails/new-user'),
          context: {
            Recipient: `${user.firstName} ${user.lastName}`,
          },
        });
      }

      return {
        role: role.name,
        ...user.toObject(),
      };
    }
  }
  async findAll(query: UserQueryDto) {
    const { page, limit, search, status, role } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }    // Build search filter
    const searchFilter: any = {};

    // Handle search query
    if (search) {
      searchFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Handle status filter
    if (status) {
      // Split status by comma and trim whitespace
      const statusArray = status.split(',').map(s => s.trim());

      if (statusArray.length > 1) {
        // Multiple statuses - use $in operator
        searchFilter.status = { $in: statusArray };
      } else {
        // Single status - exact match
        searchFilter.status = statusArray[0];
      }
    }

    const users = await this.userRepository.findAll(
      searchFilter,
      offset,
      limit,
    );

    const usersWithRoles = await Promise.all(
      users
        .filter((user) => user.role === role)
        .map(async (user) => {
          const role = await this.userRoleRepository.findOneQuery({
            userId: user._id,
          });
          const roleName = await this.roleRepository.findOne(role.roleId);
          return {
            ...user,
            role: roleName.name,
          };
        }),
    );

    const total = await this.userRepository.getTotalUsers(searchFilter);

    return {
      users: usersWithRoles,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return await this.userRepository.findOne(id);
  }

  async findUserRole(id: string): Promise<UserRoleDto> {
    return await this.userRoleRepository.findOneQuery({
      userId: id,
    });
  }

  async findOneQuery(query: unknown): Promise<IUser> {
    const user = await this.userRepository.findOneQuery(query);
    if (!user)
      throw new BadRequestException({
        email: 'User does not exist',
      });

    return {
      ...user,
      _id: user._id.toString(),
    };
  }

  async findOneQueryNew(query: unknown): Promise<IUser> {
    return await this.userRepository.findOneQuery(query);
  }

  async update(
    id: string,
    updateUserDto: IUser,
  ): Promise<IUserModel | undefined> {
    return await this.userRepository.update(id, updateUserDto);
  }

  async updateQuery(
    query: any,
    updateUserDto: Partial<IUser>,
  ): Promise<IUserModel | undefined> {
    return await this.userRepository.updateOneQuery(query, updateUserDto);
  }

  async updatePassword(user: IJwtPayload, passwordDto: UpdatePasswordDto) {
    const _user = await this.userRepository.findQueryWithPassword({
      _id: user.id,
    });
    const currentPassword = passwordDto.currentPassword;
    const isMatch = await this.comparePasswords(
      currentPassword,
      _user.password,
    );
    if (!isMatch) {
      throw new UnprocessableEntityException({
        currentPassword: 'Current Password is incorrect',
      });
    }
    const _password = await generatePasswordHash(passwordDto.password);
    return await this.updateQuery({ _id: user.id }, { password: _password });
  }

  async comparePasswords(
    password: string,
    hashedPassword: string,
  ): Promise<any> {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (err) {
      console.error('Error comparing passwords:', err);
      return false;
    }
  }

  // async updatePassword(payload: ResetPasswordDto) {
  //   const userData = { ...payload };
  //   if (userData.password) {
  //     userData.password = await generatePasswordHash(userData.password);
  //   }
  //   await this.updateQuery(
  //     { email: userData.email },
  //     { password: userData.password },
  //   );
  // }

  remove(id: string) {
    return this.userRepository.remove(id);
  }

  async findUserWithRole(
    id: Types.ObjectId | string,
  ): Promise<Omit<IUserWithRole, 'password'>> {
    const user: IUser = await this.findOneQuery({ _id: id });
    // TODO: Add a logger that will log errors to file for easy debugging in production
    if (!user) {
      throw new BadRequestException('Unable to get user');
    }

    const userRole = await this.userRole.findOneQuery({
      userId: user._id.toString(),
    });

    if (!userRole) {
      throw new InternalServerErrorException('Unable to get user details');
    }
    const role = await this.roleRepository.findOne(userRole.roleId);
    if (!role) {
      throw new InternalServerErrorException('Role not found');
    }

    const userResult: Omit<IUserWithRole, 'password'> = {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.status,
      lastSeen: user.lastSeen,
      role: role.name as RoleType,
    };

    return userResult;
  }

  async toggleStatus(id: string, toggleStatusDto: ToggleStatusDto): Promise<IUserModel> {
    const { status } = toggleStatusDto;

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException({
        status: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Check if user exists
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new BadRequestException({
        user: 'User not found',
      });
    }    // Update user status
    const updatedUser = await this.userRepository.updateOneQuery({ _id: id }, { status });
    if (!updatedUser) {
      throw new InternalServerErrorException('Failed to update user status');
    }

    return updatedUser;
  }
}
