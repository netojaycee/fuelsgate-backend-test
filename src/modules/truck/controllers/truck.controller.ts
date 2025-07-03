import { YupValidationPipe } from "src/shared/pipes/yup-validation.pipe";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, Response, UseGuards } from "@nestjs/common";
import { TruckService } from "../services/truck.service";
import { TruckDto, TruckQueryDto } from "../dto/truck.dto";
import { truckSchema, truckStatusSchema } from "../validations/truck.validation";
import { AuditLog } from "src/shared/decorators/audit-log.decorator";
import { JwtAuthGuard } from "src/shared/guards/jwt-auth.guard";

@Controller('truck')
@UseGuards(JwtAuthGuard)
export class TruckController {
  constructor(private readonly truckService: TruckService) { }

  @Get()
  async getAll(
    @Request() req,
    @Query() query: TruckQueryDto,
    @Response() res,
  ): Promise<TruckDto[]> {
    const { user } = req
    const data = await this.truckService.getAllTrucks(query, user);
    return res.status(200).json({
      message: 'Trucks fetched successfully',
      data,
      statusCode: 200,
    });
  }

  // get all user trucks
  @Get('get-user-trucks')
  async getUserTrucks(
    @Request() req,
    @Query() query: TruckQueryDto,
    @Response() res,
  ): Promise<TruckDto[]> {
    const { user } = req
    const data = await this.truckService.getUserTrucks(query, user);
    return res.status(200).json({
      message: 'User trucks fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get(':truckId')
  async getOne(
    @Param() param,
    @Response() res,
  ): Promise<TruckDto> {
    const { truckId } = param
    const truck = await this.truckService.getTruckDetail(truckId)
    return res.status(200).json({
      message: 'Truck fetched successfully',
      data: truck,
      statusCode: 200,
    });
  }

  @Post()
  @AuditLog({ action: 'CREATE_TRUCK', module: 'TRUCK' })
  async create(
    @Body(new YupValidationPipe(truckSchema)) body: TruckDto,
    @Request() req,
    @Response() res,
  ): Promise<TruckDto> {
    const { user } = req
    const truckData = await this.truckService.saveNewTruckData(body, user);
    return res.status(200).json({
      message: 'Truck Information saved successfully',
      data: truckData,
      statusCode: 200,
    });
  }

  @Put(':truckId')
  @AuditLog({ action: 'UPDATE_TRUCK', module: 'TRUCK' })
  async update(
    @Body(new YupValidationPipe(truckSchema)) body: TruckDto,
    @Param() param,
    @Response() res
  ): Promise<TruckDto> {
    const { truckId } = param;
    const data = await this.truckService.updateTruckData(truckId, body);
    return res.status(200).json({
      message: 'Truck updated successfully',
      data,
      statusCode: 200,
    });
  }

  @Delete(':truckId')
  @AuditLog({ action: 'DELETE_TRUCK', module: 'TRUCK' })
  async delete(
    @Param() param,
    @Response() res
  ): Promise<TruckDto> {
    const { truckId } = param;
    await this.truckService.deleteTruckData(truckId);
    return res.status(200).json({
      message: 'Truck deleted successfully',
      statusCode: 200,
    });
  }

  @Put(':truckId/status')
  @AuditLog({ action: 'UPDATE_TRUCK_STATUS', module: 'TRUCK' })
  async updateStatus(
    @Param() param,
    @Body(new YupValidationPipe(truckStatusSchema)) body: { status: string },
    @Request() req,
    @Response() res,
  ) {
    const { truckId } = param;
    const { status } = body;
    const { user } = req;

    const data = await this.truckService.updateTruckStatus(truckId, status as any, user);
    return res.status(200).json({
      message: 'Truck status updated successfully',
      data,
      statusCode: 200,
    });
  }
}