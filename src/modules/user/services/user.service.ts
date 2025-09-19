import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { demoLinks, generatePasswordHash, getHtmlWithFooter } from 'src/utils/helpers';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import * as bcrypt from 'bcrypt';
import { ResendService } from 'src/modules/resend/resend.service';
import { BuyerService } from 'src/modules/buyer/services/buyer.service';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userRoleRepository: UserRoleRepository,
    private readonly roleRepository: RoleRepository,
    private readonly userRole: UserRoleRepository,
    private readonly resendService: ResendService,
    private readonly buyerService: BuyerService, // Inject BuyerService properly
  ) { }

  async createNew(
    createUserDto: IUserWithRole,
    sendEmail: boolean = true,
    session?: any,
  ): Promise<IUserWithRole> {
    console.log('UserService.createNew called with role:', createUserDto.role);

    const userData = { ...createUserDto };
    if (userData.password) {
      userData.password = await generatePasswordHash(userData.password);
    }

    const role = await this.roleRepository.findRoleByName(userData.role);
    console.log('Role found:', role ? role.name : 'not found');

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

    // Transactional logic for buyer registration
    if (userData.role === 'buyer') {
      console.log('Starting buyer registration...');

        try {
          console.log('Creating user without transaction...');
          const user = await this.userRepository.create(userData);
          if (!user || !user._id) throw new Error('User creation failed');
          console.log('User created with ID:', user);

          console.log('Creating user role without transaction...');
          await this.userRepository.createUserRole({
            userId: user._id,
            roleId: role._id,
          } as UserRoleDto);
          console.log('User role created',);

          console.log('Creating buyer profile without transaction...');
          const buyerData = await this.buyerService.saveNewBuyerInfo({ category: 'reseller' }, { role: userData.role, ...user });
          if (!buyerData || !buyerData._id) throw new Error('Buyer profile creation failed');
          console.log('Buyer profile created with ID:', buyerData._id);

          if (sendEmail) {
            // Send personalised buyer welcome email using HTML and footer helper
            try {
              let buyerWelcomeHtml = fs.readFileSync(path.join(__dirname, '../../../templates/buyer-welcome.html'), 'utf8');
              // Replace dynamic fields
              buyerWelcomeHtml = buyerWelcomeHtml.replace(/{{user_name}}/g, `${user.firstName} ${user.lastName},`);
              // Add footer automatically
              buyerWelcomeHtml = getHtmlWithFooter(buyerWelcomeHtml);
              await this.resendService.sendMail({
                to: `${user.email}`,
                subject: `Get Ready to Supercharge Your Productivity with Fuelsgate!`,
                html: buyerWelcomeHtml,
              });
              console.log('Buyer welcome email sent successfully');
            } catch (emailError) {
              console.error('Buyer welcome email sending failed, but continuing with registration:', emailError);
            }

            // Send second general email using HTML from file (not personalised)
            try {
              let generalHtml = fs.readFileSync(path.join(__dirname, '../../../templates/general-info.html'), 'utf8');
              // Replace dynamic fields
              generalHtml = generalHtml.replace(/{{role}}/g, `${role.name}`);
              generalHtml = generalHtml.replace(/{{demoLinks}}/g, `${demoLinks.trader}`);

              // Add footer automatically
              generalHtml = getHtmlWithFooter(generalHtml); 
              await this.resendService.sendMail({
                to: `${user.email}`,
                subject: `Your Fuelsgate Smart Contract (Ticket Order)`,
                html: generalHtml,
              });
              console.log('General info email sent successfully');
            } catch (emailError) {
              console.error('General info email sending failed, but continuing with registration:', emailError);
            }
          }

          console.log('Buyer registration completed successfully (non-transactional)');
          return {
            role: role.name,
            ...user.toObject(),
            buyerData,
          };

        } catch (error) {
          console.error('Non-transactional buyer registration failed:', error);
          throw new BadRequestException({
            message: 'Buyer registration failed: ' + (error.message || 'Unknown error'),
          });
        }
    }

    
    // Non-buyer user creation (no transaction needed)
    console.log('Creating non-buyer user...');
    const user = await this.userRepository.create(userData, { session });

    if (user) {
      if (!userData.role) {
        return null;
      }

      console.log('Creating user role for non-buyer...');
      await this.userRepository.createUserRole({
        userId: user._id,
        roleId: role._id,
      } as UserRoleDto, { session });

      if (sendEmail && userData.role === 'transporter') {
        console.log('Sending welcome email for transporter...');
        try {
          let transporterWelcomeHtml = fs.readFileSync(path.join(__dirname, '../../../templates/transporter-welcome.html'), 'utf8');
          // Replace dynamic fields
          transporterWelcomeHtml = transporterWelcomeHtml.replace(/{{user_name}}/g, `${user.firstName} ${user.lastName},`);
          // Add footer automatically
          transporterWelcomeHtml = getHtmlWithFooter(transporterWelcomeHtml);
          await this.resendService.sendMail({
            to: `${user.email}`,
            subject: `Welcome to Fuelsgate`,
            html: transporterWelcomeHtml,
          });
          console.log('Transporter welcome email sent successfully');
        } catch (emailError) {
          console.error('Transporter welcome email sending failed, but continuing with registration:', emailError);
        }

        // Send second general email using HTML from file (not personalised)
        try {
          let generalHtml = fs.readFileSync(path.join(__dirname, '../../../templates/general-info.html'), 'utf8');
          // Replace dynamic fields
          generalHtml = generalHtml.replace(/{{role}}/g, `${role.name}`);
          generalHtml = generalHtml.replace(/{{demoLinks}}/g, `${demoLinks.transporter}`);
          // Add footer automatically
          generalHtml = getHtmlWithFooter(generalHtml);
          await this.resendService.sendMail({
            to: `${user.email}`,
            subject: `Your Fuelsgate Smart Contract (Ticket Order)`,
            html: generalHtml,
          });
          console.log('General info email sent successfully');
        } catch (emailError) {
          console.error('General info email sending failed, but continuing with registration:', emailError);
        }
      }

      console.log('Non-buyer user creation completed successfully');
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

    // console.log(role, status)

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

    // Get role names for each user and filter by role name if provided
    let usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const userRole = await this.userRoleRepository.findOneQuery({
          userId: user._id,
        });
        const roleObj = userRole ? await this.roleRepository.findOne(userRole.roleId) : null;
        return {
          ...user,
          role: roleObj ? roleObj.name : null,
        };
      }),
    );

    // Filter by role name if provided
    if (role) {
      const roleArray = role.split(',').map(r => r.trim().toLowerCase());
      usersWithRoles = usersWithRoles.filter(u =>
        u.role && roleArray.includes(u.role.toLowerCase())
      );
    }

    // You may want to update total to reflect filtered users
    const total = usersWithRoles.length;


    // const total = await this.userRepository.getTotalUsers(searchFilter);

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
      canLoad: user.canLoad,
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

  async findUsersByEmails(emails: string[]): Promise<IUser[]> {
    if (!emails || emails.length === 0) {
      throw new BadRequestException({
        emails: 'Email array cannot be empty',
      });
    }

    // Validate emails format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));

    if (invalidEmails.length > 0) {
      throw new BadRequestException({
        emails: `Invalid email format: ${invalidEmails.join(', ')}`,
      });
    }

    const users = await this.userRepository.findAll({
      email: { $in: emails }
    });

    return users;
  }
  async toggleCanLoad(admin: IJwtPayload, userId: string) {
    if (admin.role !== 'admin') {
      throw new ForbiddenException('Unauthorized Access');
    }
    const user = await this.userRepository.findOne(userId);
    if (!user) throw new BadRequestException('User not found');
  const updatedUser = await this.userRepository.update(userId, { canLoad: !(user as any).canLoad } as any);
  return updatedUser;
  }
}
