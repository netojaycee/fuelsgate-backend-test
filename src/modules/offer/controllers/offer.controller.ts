import { OfferService } from "../services/offer.service";
import { OfferDto, OfferQueryDto } from "../dto/offer.dto";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Response } from "@nestjs/common";
import { YupValidationPipe } from "src/shared/pipes/yup-validation.pipe";
import { offerSchema, offerStatusSchema } from "../validations/offer.validation";

@Controller('offer')
export class OfferController {
  constructor(private readonly offerService: OfferService) { }

  @Get('get-offers-count')
  async getOffersCount(
    @Query() query: OfferQueryDto,
    @Response() res,
  ): Promise<[]> {
    const data = await this.offerService.getOffersCount(query)
    return res.status(200).json({
      message: 'Offers count fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get()
  async getAll(
    @Query() query: OfferQueryDto,
    @Response() res,
  ): Promise<[]> {
    const data = await this.offerService.getAllOffers(query);
    return res.status(200).json({
      message: 'Offers fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get(':offerId')
  async getOne(
    @Param() param,
    @Response() res,
  ): Promise<[]> {
    const { offerId } = param
    const data = await this.offerService.getOfferDetail(offerId);
    return res.status(200).json({
      message: 'Order fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Post()
  async create(
    @Request() req,
    @Body(new YupValidationPipe(offerSchema)) body: OfferDto,
    @Response() res,
  ): Promise<[]> {
    const { user } = req
    const data = await this.offerService.saveNewOfferData(body, user);
    return res.status(200).json({
      message: 'Offer created successfully',
      data,
      statusCode: 200,
    });
  }

  @Patch(':offerId')
  async updateStatus(
    @Param() param,
    @Body(new YupValidationPipe(offerStatusSchema)) body: OfferDto,
    @Response() res,
  ): Promise<[]> {
    const { offerId } = param
    const data = await this.offerService.updateOfferData(offerId, body);
    return res.status(200).json({
      message: 'Offer Updated successfully',
      data,
      statusCode: 200,
    });
  }

  @Delete(':offerId')
  async delete(
    @Param() param,
    @Response() res,
  ): Promise<[]> {
    const { offerId } = param
    await this.offerService.deleteOfferData(offerId);
    return res.status(200).json({
      message: 'Offer deleted successfully',
      statusCode: 200,
    });
  }
}