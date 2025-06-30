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
import { SellerService } from '../services/seller.service';
import { SellerDto } from '../dto/seller.dto';
import { profilePictureSchema, sellerSchema } from '../validations/seller.validation';

@Controller('seller')
export class SellerController {
  constructor(private readonly sellerService: SellerService) { }

  @Post('onboarding')
  async createSellerInfo(
    @Body(new YupValidationPipe(sellerSchema)) body: SellerDto,
    @Request() req,
    @Response() res,
  ): Promise<SellerDto> {
    const sellerData = await this.sellerService.saveNewSellerInfo(
      body,
      req.user,
    );
    return res.status(200).json({
      message: 'Seller Information saved successfully',
      data: sellerData,
      statusCode: 200,
    });
  }

  @Get('analytics')
  async getTransporterAnalytics(
    @Request() req,
    @Response() res
  ): Promise<any> {
    const { user } = req
    const data = await this.sellerService.getAnalytics(user)
    return res.status(200).json({
      message: 'Seller analytics fetched successfully',
      data,
      statusCode: 200,
    })
  }

  @Put('update')
  async updateProfile(
    @Request() req,
    @Body(new YupValidationPipe(sellerSchema)) body: SellerDto,
    @Response() res
  ): Promise<any> {
    const { user } = req
    const data = await this.sellerService.updateSellerAccount(body, user)
    return res.status(200).json({
      message: 'Seller profile updated successfully',
      data,
      statusCode: 200,
    })
  }

  @Post('upload-profile-picture')
  async uploadProfilePicture(
    @Request() req,
    @Body(new YupValidationPipe(profilePictureSchema)) body: Partial<SellerDto>,
    @Response() res
  ): Promise<any> {
    const { user } = req
    const data = await this.sellerService.updateSellerAccount(body, user)
    return res.status(200).json({
      message: 'Seller profile picture uploaded successfully',
      data,
      statusCode: 200,
    })
  }
}
