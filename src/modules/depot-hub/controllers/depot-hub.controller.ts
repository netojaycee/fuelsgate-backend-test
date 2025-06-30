import { YupValidationPipe } from "src/shared/pipes/yup-validation.pipe";
import { Body, Controller, Delete, Get, Param, Post, Put, Response } from "@nestjs/common";
import { DepotHubService } from "../services/depot-hub.service";
import { DepotHubDto } from "../dto/depot-hub.dto";
import { depotHubSchema } from "../validations/depot-hub.validation";

@Controller('depot-hub')
export class DepotHubController {
  constructor(private readonly depotHubService: DepotHubService) { }

  @Get()
  async getAll(
    @Response() res,
  ): Promise<DepotHubDto[]> {
    const data = await this.depotHubService.getAllDepotHubs();
    return res.status(200).json({
      message: 'DepotHubs fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get(':depotHubId')
  async getOne(
    @Param() param,
    @Response() res,
  ): Promise<DepotHubDto> {
    const { depotHubId } = param
    const depotHub = await this.depotHubService.getDepotHubDetail(depotHubId)
    return res.status(200).json({
      message: 'DepotHub fetched successfully',
      data: depotHub,
      statusCode: 200,
    });
  }

  @Post()
  async create(
    @Body(new YupValidationPipe(depotHubSchema)) body: DepotHubDto,
    @Response() res,
  ): Promise<DepotHubDto> {
    const depotHubData = await this.depotHubService.saveNewDepotHubData(body);
    return res.status(200).json({
      message: 'DepotHub Information saved successfully',
      data: depotHubData,
      statusCode: 200,
    });
  }

  @Put(':depotHubId')
  async update(
    @Body(new YupValidationPipe(depotHubSchema)) body: DepotHubDto,
    @Param() param,
    @Response() res
  ): Promise<DepotHubDto> {
    const { depotHubId } = param;
    const data = await this.depotHubService.updateDepotHubData(depotHubId, body);
    return res.status(200).json({
      message: 'DepotHub updated successfully',
      data,
      statusCode: 200,
    });
  }

  @Delete(':depotHubId')
  async delete(
    @Param() param,
    @Response() res
  ): Promise<DepotHubDto> {
    const { depotHubId } = param;
    await this.depotHubService.deleteDepotHubData(depotHubId);
    return res.status(200).json({
      message: 'DepotHub deleted successfully',
      statusCode: 200,
    });
  }
}