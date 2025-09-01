import {
  Body,
  Controller,
  Get,
  Post,
  Response,
} from '@nestjs/common';
import { AuthenticationService } from '../services/authentication.service';
import { IUserWithRole } from 'src/modules/user/dto/user.dto';
import { UserService } from 'src/modules/user/services/user.service';
import { Public } from 'src/shared/decorators/public.route.decorator';
import {
  LoginDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from '../dto/authentication.dto';
import { AuthenticatedUser } from 'src/shared/decorators/auth.user.decorator';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';
import {
  forgotPasswordSchema,
  loginSchema,
  registrationSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from '../validations/authentication.validation';
import { errorResponse } from 'src/utils/responseHandler';
import { AuditLog } from 'src/shared/decorators/audit-log.decorator';
import { BuyerService } from 'src/modules/buyer/services/buyer.service';

@Controller('')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly userService: UserService,
    private readonly buyerService: BuyerService,
  ) { }
  @Public()
  @Post('login')
  @AuditLog({ action: 'LOGIN', module: 'AUTHENTICATION' })
  async login(
    @Body(new YupValidationPipe(loginSchema)) body: LoginDto,
    @Response() res,
  ): Promise<IUserWithRole | any> {
    try {
      const { email, password } = body;
      const data = await this.authenticationService.validateUser(
        email,
        password,
      );

      // Prevent login for sellers
      if (data.user.role === 'seller') {
        return res.status(403).json({
          message: 'Login for sellers is not allowed.',
          statusCode: 403,
        });
      }

      if (data.user.status === 'pending') {
        return res.status(403).json({
          message: '🔒 Account not activated. Please contact admin to activate your account.',
          statusCode: 403,
        });
      }

      if (data.user.status === 'suspended') {
        return res.status(403).json({
          message: '🚫 Account temporarily suspended. Please contact our admin team to reactivate your account.',
          statusCode: 403,
        });
      }

      if (data.user.status === 'inactive') {
        return res.status(403).json({
          message: '🚫 Account has been permanently banned. Please contact support for more information.',
          statusCode: 403,
        });
      }

      return res.status(200).json({
        message: 'User login successfully',
        data,
        statusCode: 200,
      });
    } catch (error) {
      console.log(error);
      return errorResponse(error.response, error.message, error.status, res);
    }
  }
  @Public()
  @Post('register')
  @AuditLog({ action: 'REGISTER', module: 'AUTHENTICATION' })
  async register(
    @Body(new YupValidationPipe(registrationSchema)) registerData: IUserWithRole,
    @Response() res,
  ): Promise<IUserWithRole | any> {
    try {
      console.log('Registration attempt for role:', registerData.role);

      // Prevent registration for role 'seller'
      if (registerData.role === 'seller') {
        return res.status(403).json({
          message: 'Registration for sellers is not allowed.',
          statusCode: 403,
        });
      }

      // Prevent registration for role 'admin' (admins should be created by other admins)
      if (registerData.role === 'admin') {
        return res.status(403).json({
          message: 'Admin registration through this endpoint is not allowed.',
          statusCode: 403,
        });
      }

      // If role is transporter, just create user and return registration success
      if (registerData.role === 'transporter') {
        console.log('Creating transporter user...');
        await this.userService.createNew(registerData);
        console.log('Transporter user created successfully');
        return res.status(200).json({
          message: 'Transporter registration successful. Your account is pending approval.',
          data: { role: registerData.role },
          statusCode: 200,
        });
      }

      // For buyers, atomic registration is handled in the service
      if (registerData.role === 'buyer') {
        console.log('Creating buyer user...');
        try {
          const user = await this.userService.createNew(registerData);
          console.log('Buyer user created, attempting login...');

          if (!user || !user._id) {
            throw new Error('User creation failed');
          }
          if (user.role !== 'buyer') {
            throw new Error('Role must be buyer');
          }

          // Attempt login and return response
          const data = await this.authenticationService.validateUser(registerData.email, registerData.password);
          console.log('Buyer login successful');

          return res.status(200).json({
            message: 'Buyer registration and login successful',
            data: {
              ...data,
              buyerData: user.buyerData
            },
            statusCode: 200,
          });
        } catch (err) {
          console.error('Buyer registration error:', err);
          return res.status(500).json({
            message: 'Registration failed: ' + (err.message || 'Unknown error'),
            statusCode: 500,
          });
        }
      }

      // For any other unhandled roles
      // console.log('Unknown role, falling back to basic user creation...');
      // await this.userService.createNew(registerData);
      // const data = await this.authenticationService.validateUser(registerData.email, registerData.password);
      // return res.status(200).json({
      //   message: 'User registration successfully',
      //   data,
      //   statusCode: 200,
      // });
    } catch (error) {
      console.error('Registration controller error:', error);
      return errorResponse(error.response, error.message, error.status || 500, res);
    }
  }
  @Public()
  @Post('forgot-password')
  @AuditLog({ action: 'FORGOT_PASSWORD', module: 'AUTHENTICATION' })
  async forgotPassword(
    @Body(new YupValidationPipe(forgotPasswordSchema)) body: LoginDto,
    @Response() res,
  ): Promise<void | any> {
    try {
      const { email } = body;

      const user = await this.authenticationService.checkIfEmailExists(email);
      if (user) {
        await this.authenticationService.sendOTP(user);
      }

      return res.status(200).json({
        message: 'OTP has been sent to your email',
        data: {
          email: user.email,
        },
        statusCode: 200,
      });
    } catch (error) {
      return errorResponse(error.response, error.message, error.status, res);
    }
  }
  @Public()
  @Post('verify-otp')
  @AuditLog({ action: 'VERIFY_OTP', module: 'AUTHENTICATION' })
  async verifyOtp(
    @Body(new YupValidationPipe(verifyOtpSchema)) body: VerifyOtpDto,
    @Response() res,
  ): Promise<void | any> {
    try {
      const user = await this.authenticationService.validateCode(body);

      return res.status(200).json({
        message: 'OTP has been verified',
        data: {
          email: user.email,
        },
        statusCode: 200,
      });
    } catch (error) {
      return errorResponse(error.response, error.message, error.status, res);
    }
  }
  @Public()
  @Post('reset-password')
  @AuditLog({ action: 'RESET_PASSWORD', module: 'AUTHENTICATION' })
  async resetPassword(
    @Body(new YupValidationPipe(resetPasswordSchema)) body: ResetPasswordDto,
    @Response() res,
  ): Promise<void | any> {
    try {
      await this.authenticationService.updatePassword(body);

      return res.status(200).json({
        message: 'Password has been updated',
        statusCode: 200,
      });
    } catch (error) {
      return errorResponse(error.response, error.message, error.status, res);
    }
  }

  @Get('view-profile')
  async getRegisterData(
    @AuthenticatedUser() user: { id: string; email: string },
  ): Promise<Omit<IUserWithRole, 'password'>> {
    return this.userService.findUserWithRole(user.id);
  }
}
