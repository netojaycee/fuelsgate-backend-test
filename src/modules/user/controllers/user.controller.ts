import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Response,
  Query,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { IUser, IUserWithRole, UpdatePasswordDto, UserQueryDto, ToggleStatusDto } from '../dto/user.dto';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';
import { updatePasswordSchema } from '../validations/user.validation';
import { ResendService } from 'src/modules/resend/resend.service';
import { AuditLog } from 'src/shared/decorators/audit-log.decorator';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../entities/user.entity';
import { Model } from 'mongoose';
import * as fs from 'fs';
import { Public } from 'src/shared/decorators/public.route.decorator';
import { getHtmlWithFooter } from 'src/utils/helpers';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService,
    private readonly resendService: ResendService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
) { }
  @Post()
  @AuditLog({ action: 'CREATE_USER', module: 'USER' })
  create(@Body() createUserDto: IUserWithRole): Promise<IUserWithRole> {
    return this.userService.createNew(createUserDto);
  }

  @Get()
  async findAll(
    @Query() query: UserQueryDto,
    @Response() res,
  ): Promise<IUserWithRole[]> {
    const data = await this.userService.findAll(query);
    return res.status(200).json({
      message: 'Users fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Public()
  @Get('send-supplier-sunset')
    async sendSupplierSunset() {
      const results: Array<{ recipient: string; status: string; error?: string }> = [];
  
      // Helper functions for throttling
      const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
      const BASE_DELAY_MS = 700;            // ~1.4 req/sec (safe under 2 rps)
      const MAX_RETRIES = 3;                // retry on 429
      const BACKOFF = (attempt: number) => Math.min(2000 * attempt, 8000); // 2s,4s,6s caps at 8s
  
      // Cache template
      const templatePath = path.join(__dirname, '../../../templates/supplier-sunset.html');
      const template = fs.readFileSync(templatePath, 'utf8');
  
      try {
        // Find all users created before August 1st, 2025
        const cutoffDate = new Date('2025-08-01T00:00:00.000Z');
        const users = await this.userModel.find({
          createdAt: { $lt: cutoffDate }
        }).select('email firstName').exec();
  
        console.log(`Found ${users.length} users to process`);
  
        // Add netojaycee@gmail.com with name Jaycee to the list
        const allUsers = [
          ...users,
          { email: 'netojaycee@gmail.com', firstName: 'Jaycee' }
        ];

        for (const user of allUsers) {
          if (!user.email) continue;  // Skip users without email

          let attempt = 0;
          while (attempt <= MAX_RETRIES) {
            try {
              // Prepare email content
              let html = template.replace(/{{user_name}}/g, user.firstName || 'Valued User');
              html = getHtmlWithFooter(html);

              // Send email
              await this.resendService.sendMail({
          to: user.email,
          subject: 'Fuelsgate Supplier Role Sunset',
          html,
              });

              results.push({
          recipient: user.email,
          status: 'sent'
              });
              break; // Success, exit retry loop

            } catch (err: any) {
              if (err?.statusCode === 429 && attempt < MAX_RETRIES) {
          attempt++;
          const wait = BACKOFF(attempt);
          await sleep(wait);
          continue;
              }

              results.push({
          recipient: user.email,
          status: 'failed',
          error: err?.message || 'unknown error',
              });
              break;
            } finally {
              // Global throttle to stay < 2 rps
              await sleep(BASE_DELAY_MS);
            }
          }
        }
  
        return {
          message: 'Supplier sunset emails sent',
          totalProcessed: users.length,
          results
        };
  
      } catch (error) {
        console.error('Error in sendSupplierSunset:', error);
        throw error;
      }
    }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }
  @Patch('change-password')
  @AuditLog({ action: 'CHANGE_PASSWORD', module: 'USER' })
  async updatePassword(
    @Request() req,
    @Body(new YupValidationPipe(updatePasswordSchema)) body: UpdatePasswordDto,
    @Response() res,
  ) {
    const { user } = req
    const data = await this.userService.updatePassword(user, body);
    return res.status(200).json({
      message: 'Password changed successfully',
      data,
      statusCode: 200,
    });
  }
  @Patch(':id/status')
  @AuditLog({ action: 'TOGGLE_STATUS', module: 'USER' })
  async toggleStatus(
    @Param('id') id: string,
    @Body() toggleStatusDto: ToggleStatusDto,
    @Response() res,
  ) {
    const data = await this.userService.toggleStatus(id, toggleStatusDto);
    return res.status(200).json({
      message: 'User status updated successfully',
      data,
      statusCode: 200,
    });
  }
  @Patch(':id')
  @AuditLog({ action: 'UPDATE_USER', module: 'USER' })
  update(@Param('id') id: string, @Body() updateUserDto: IUser) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @AuditLog({ action: 'DELETE_USER', module: 'USER' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Post('by-emails')
  async findUsersByEmails(
    @Body() { emails }: { emails: string[] },
    @Response() res,
  ) {
    try {
      const users = await this.userService.findUsersByEmails(emails);
      return res.status(200).json({
        message: 'Users fetched successfully',
        data: users,
        statusCode: 200,
      });
    } catch (error) {
      return res.status(400).json({
        message: error.message || 'Failed to fetch users',
        statusCode: 400,
      });
    }
  }

  // Add this to your user.controller.ts for testing
  // @Post('test-email')
  // async testEmail(
  //   @Body() { email }: { email: string },
  //   @Response() res
  // ) {
  //   try {
  //     await this.resendService.sendMail({
  //       to: email,
  //       subject: 'Test Email from Fuelsgate',
  //       html: '<h1>Hello!</h1><p>This is a test email from your Fuelsgate app.</p>',
  //     });

  //     return res.status(200).json({
  //       message: 'Email sent successfully',
  //       statusCode: 200,
  //     });
  //   } catch (error) {
  //     console.error('Email error:', error);
  //     return res.status(500).json({
  //       message: 'Email failed to send',
  //       error: error.message,
  //       statusCode: 500,
  //     });
  //   }
  // }
}
