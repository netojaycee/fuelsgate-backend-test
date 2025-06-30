import { PricingDto, PricingQueryDto } from '../dto/pricing.dto';
import { PricingService } from '../services/pricing.service';
import {
  priceSchema,
  priceStatusSchema,
} from '../validations/pricing.validation';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Response,
} from '@nestjs/common';
import { Public } from 'src/shared/decorators/public.route.decorator';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Public()
  @Get()
  async getAll(
    @Query() query: PricingQueryDto,
    @Response() res,
  ): Promise<PricingDto[]> {
    const data = await this.pricingService.getAllpricings(query);
    return res.status(200).json({
      message: 'pricings fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Public()
  @Get(':pricingId')
  async getOne(@Param() param, @Response() res): Promise<PricingDto> {
    const { pricingId } = param;
    const pricing = await this.pricingService.getpricingDetail(pricingId);
    return res.status(200).json({
      message: 'pricing fetched successfully',
      data: pricing,
      statusCode: 200,
    });
  }

  @Public()
  @Post()
  async create(
    @Body(new YupValidationPipe(priceSchema)) body: PricingDto,
    @Response() res,
  ): Promise<PricingDto> {
    const pricingData = await this.pricingService.saveNewpricingData(body);
    return res.status(200).json({
      message: 'pricing Information saved successfully',
      data: pricingData,
      statusCode: 200,
    });
  }

  @Public()
  @Put(':pricingId')
  async update(
    @Body(new YupValidationPipe(priceSchema)) body: PricingDto,
    @Param() param,
    @Response() res,
  ): Promise<PricingDto> {
    const { pricingId } = param;
    const data = await this.pricingService.updatepricingData(pricingId, body);
    return res.status(200).json({
      message: 'pricing updated successfully',
      data,
      statusCode: 200,
    });
  }

  @Public()
  @Put(':pricingId/status')
  async updateStatus(
    @Body(new YupValidationPipe(priceStatusSchema))
    body: Pick<PricingDto, 'activeStatus'>,
    @Param() param,
    @Response() res,
  ): Promise<PricingDto> {
    const { pricingId } = param;
    const data = await this.pricingService.updatepricingStatus(pricingId, body);
    return res.status(200).json({
      message: 'pricing status updated successfully',
      data,
      statusCode: 200,
    });
  }

  @Public()
  @Delete(':pricingId')
  async delete(@Param() param, @Response() res): Promise<PricingDto> {
    const { pricingId } = param;
    await this.pricingService.deletepricingData(pricingId);
    return res.status(200).json({
      message: 'pricing deleted successfully',
      statusCode: 200,
    });
  }
}
