import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Request,
  Response,
} from '@nestjs/common';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';
import { TransporterDto } from '../dto/transporter.dto';
import { transporterSchema } from '../validations/transporter.validation';
import { TransporterService } from '../services/transporter.service';
import { profilePictureSchema } from 'src/modules/seller/validations/seller.validation';

@Controller('transporter')
export class TransporterController {
  constructor(private readonly transporterService: TransporterService) { }

  @Post('onboarding')
  async createTransporterInfo(
    @Body(new YupValidationPipe(transporterSchema)) body: TransporterDto,
    @Request() req,
    @Response() res,
  ): Promise<TransporterDto> {
    const transporterData =
      await this.transporterService.saveNewTransporterInfo(body, req.user);
    return res.status(200).json({
      message: 'Transporter Information saved successfully',
      data: transporterData,
      statusCode: 200,
    });
  }

  @Get('analytics')
  async getTransporterAnalytics(
    @Request() req,
    @Response() res
  ): Promise<any> {
    const { user } = req
    const data = await this.transporterService.getAnalytics(user)
    return res.status(200).json({
      message: 'Transporter analytics fetched successfully',
      data,
      statusCode: 200,
    })
  }

  @Put('update')
  async updateProfile(
    @Request() req,
    @Body(new YupValidationPipe(transporterSchema)) body: TransporterDto,
    @Response() res
  ): Promise<any> {
    const { user } = req
    const data = await this.transporterService.updateTransporterAccount(body, user)
    return res.status(200).json({
      message: 'Transporter profile updated successfully',
      data,
      statusCode: 200,
    })
  }

  @Post('upload-profile-picture')
  async uploadProfilePicture(
    @Request() req,
    @Body(new YupValidationPipe(profilePictureSchema)) body: Partial<TransporterDto>,
    @Response() res
  ): Promise<any> {
    const { user } = req
    const data = await this.transporterService.updateTransporterAccount(body, user)
    return res.status(200).json({
      message: 'Transporter profile picture uploaded successfully',
      data,
      statusCode: 200,
    })
  }
}
