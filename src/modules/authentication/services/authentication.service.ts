import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/modules/user/services/user.service';
import { RoleService } from 'src/modules/role/service/role.service';
import { IUser } from 'src/modules/user/dto/user.dto';
import { ResendService } from 'src/modules/resend/resend.service';
import { join } from 'path';
import {
  generateNumericCode,
  generatePasswordHash,
  getTimeDifference,
} from 'src/utils/helpers';
import {
  AuthenticationRepository,
  IOtpModel,
} from '../repositories/authentication.repository';
import { ResetPasswordDto, VerifyOtpDto } from '../dto/authentication.dto';
import { BuyerRepository } from 'src/modules/buyer/repositories/buyer.repository';
import { SellerRepository } from 'src/modules/seller/repositories/seller.repository';
import { TransporterRepository } from 'src/modules/transporter/repositories/transporter.repository';
import { SellerDto } from 'src/modules/seller/dto/seller.dto';
import { ProductRepository } from 'src/modules/product/repositories/product.repository';
import { AdminRepository } from 'src/modules/admin/repositories/admin.repository';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly roleService: RoleService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly resendService: ResendService,
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly buyerRepository: BuyerRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly transporterRepository: TransporterRepository,
    private readonly productRepository: ProductRepository,
    private readonly adminRepository: AdminRepository,
  ) { }

  async checkIfEmailExists(email: string): Promise<IUser> {
    const _user = await this.userService.findOneQuery({ email });
    if (!_user) {
      throw new NotFoundException({
        email: 'email does not exist',
      });
    }
    return _user;
  }

  async validateCode(payload: VerifyOtpDto): Promise<IOtpModel> {
    const otp = await this.authenticationRepository.findOTPQuery({
      ...payload,
    });

    if (!otp) {
      throw new BadRequestException({
        otp: 'Invalid OTP',
      });
    }

    const howLongHasTheOtpBeenCreated = getTimeDifference(
      otp.createdAt,
    ).minutes;

    if (howLongHasTheOtpBeenCreated > 15) {
      await this.authenticationRepository.deleteOTPQuery({
        ...payload,
      });

      throw new BadRequestException({
        otp: 'This OTP is expired. Please request a new OTP.',
      });
    } else {
      return otp;
    }
  }

  async sendOTP(payload: IUser) {
    await this.authenticationRepository.deleteOTPQuery({
      email: payload.email,
    });

    const otp = generateNumericCode();

    await this.authenticationRepository.saveVerificationCode({
      otp: otp.toString(),
      email: payload.email,
    });

    await this.resendService.sendMail({
      to: `${payload.email}`,
      subject: `Password Reset Request`,
      template: join(__dirname, '../mails/forgot-password.ejs'),
      context: {
        Recipient: `${payload.firstName} ${payload.lastName}`,
        OTP: otp,
      },
    });
  }

  async validateUser(email: string, password: string) {
    const _user = await this.checkIfEmailExists(email);

    const isMatch = await this.comparePasswords(password, _user.password);
    if (!isMatch) {
      throw new UnprocessableEntityException({
        password: 'Password is incorrect',
      });
    }

    const user = await this.userService.findUserWithRole(_user._id);
    let profile: unknown;

    console.log(user, "user")

    switch (user.role) {
      case 'buyer':
        profile = await this.buyerRepository.findOneQuery({ userId: user._id });
        break;
      case 'admin':
        profile = await this.adminRepository.findOneQuery({ userId: user._id });
        break;
      case 'seller':
        profile = await this.sellerRepository.findOneQuery({
          userId: user._id,
        });
        if (profile) {
          const productIds = (profile as SellerDto)?.products;
          const products = await this.productRepository.findAll({
            _id: { $in: productIds },
          });
          (profile as SellerDto).products = products.map(
            (product) => product.name,
          );
        }
        break;
      case 'transporter':
        profile = await this.transporterRepository.findOneQuery({
          userId: user._id,
        });
        break;
      default:
        profile = {};
        break;
    }    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const token = this.jwtService.sign(payload);

    const finalResult = {
      user: {
        ...user,
        token,
      },
      profile,
    };

    return finalResult;
  }

  async getUserRole(id: string): Promise<string> {
    const userRole = await this.userService.findUserRole(id);

    if (!userRole) {
      throw new NotFoundException('User role not found');
    }

    const role = await this.roleService.findOne(userRole.roleId);

    return role.name;
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

  async updatePassword(payload: ResetPasswordDto) {
    const userData = { ...payload };
    if (userData.password) {
      userData.password = await generatePasswordHash(userData.password);
    }

    await this.userService.updateQuery(
      { email: userData.email },
      { password: userData.password },
    );
  }
}
