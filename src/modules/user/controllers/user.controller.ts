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
import { MailerService } from '@nestjs-modules/mailer';
import { AuditLog } from 'src/shared/decorators/audit-log.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService,
    private readonly mailService: MailerService) { }
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

  // Add this to your user.controller.ts for testing
  @Post('test-email')
  async testEmail(
    @Body() { email }: { email: string },
    @Response() res
  ) {
    try {
      await this.mailService.sendMail({
        to: email,
        subject: 'Test Email from Fuelsgate',
        html: '<h1>Hello!</h1><p>This is a test email from your Fuelsgate app.</p>',
      });

      return res.status(200).json({
        message: 'Email sent successfully',
        statusCode: 200,
      });
    } catch (error) {
      console.error('Email error:', error);
      return res.status(500).json({
        message: 'Email failed to send',
        error: error.message,
        statusCode: 500,
      });
    }
  }
}
