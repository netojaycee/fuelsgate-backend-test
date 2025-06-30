import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Response,
} from '@nestjs/common';
import { BuyerService } from '../services/buyer.service';
import { BuyerDto } from '../dto/buyer.dto';
import { buyerSchema } from '../validations/buyer.validation';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';

@Controller('buyer')
export class BuyerController {
  constructor(private readonly buyerService: BuyerService) { }

  @Post('onboarding')
  async createBuyerInfo(
    @Body(new YupValidationPipe(buyerSchema)) body: BuyerDto,
    @Request() req,
    @Response() res,
  ): Promise<BuyerDto> {
    const buyerData = await this.buyerService.saveNewBuyerInfo(body, req.user);
    return res.status(200).json({
      message: 'Buyer Information saved successfully',
      data: buyerData,
      statusCode: 200,
    });
  }


  @Get('analytics')
  async getBuyerAnalytics(
    @Request() req,
    @Response() res
  ): Promise<any> {
    const { user } = req
    const data = await this.buyerService.getAnalytics(user)
    return res.status(200).json({
      message: 'Buyer analytics fetched successfully',
      data,
      statusCode: 200,
    })
  }

  @Get('scroll-data')
  async getBuyerScrollData(
    @Request() req,
    @Response() res
  ): Promise<any> {
    const { user } = req
    const data = await this.buyerService.getScrollData(user)
    return res.status(200).json({
      message: 'Buyer scroll fetched successfully',
      data,
      statusCode: 200,
    });
  }
}
