import { TruckOrderDto, TruckOrderQueryDto } from "../dto/truck-order.dto";
import { TruckOrderService } from "../services/truck-order.service";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Response } from "@nestjs/common";
import { truckOrderSchema, updatePriceSchema, updateRfqStatusSchema, updateStatusSchema } from "../validations/truck-order.validation";
import { YupValidationPipe } from "src/shared/pipes/yup-validation.pipe";
import { AuditLog } from 'src/shared/decorators/audit-log.decorator';

@Controller('truck-order')
export class OrderController {
  constructor(private readonly truckOrderService: TruckOrderService) { }

  @Get()
  async getAll(
    @Query() query: TruckOrderQueryDto,
    @Request() req,
    @Response() res,
  ): Promise<[]> {
    const { user } = req;
    const data = await this.truckOrderService.getAllOrders(query, user);
    return res.status(200).json({
      message: 'Truck Orders fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get('get-truck-orders-count')
  async getTruckOrdersCount(
    @Query() query: TruckOrderQueryDto,
    @Request() req,
    @Response() res,
  ): Promise<[]> {
    const { user } = req;
    const data = await this.truckOrderService.getTruckOrdersCount(query, user);
    return res.status(200).json({
      message: 'Truck Orders count fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get(':truckOrderId')
  async getOne(
    @Param() param,
    @Request() req,
    @Response() res,
  ): Promise<[]> {
    const { truckOrderId } = param;
    const { user } = req;
    const data = await this.truckOrderService.getOneOrder(truckOrderId, user);
    return res.status(200).json({
      message: 'Truck Order fetched successfully',
      data,
      statusCode: 200,
    });
  }
  @Post()
  @AuditLog({ action: 'CREATE_TRUCK_ORDER', module: 'TRUCK_ORDER' })
  async create(
    @Request() req,
    @Body(new YupValidationPipe(truckOrderSchema)) body: TruckOrderDto,
    @Response() res,
  ): Promise<[]> {
    const { user } = req
    const data = await this.truckOrderService.createNewOrder(body, user);
    return res.status(200).json({
      message: 'Order created successfully',
      data,
      statusCode: 200,
    });
  }
  @Patch('status/:truckOrderId')
  @AuditLog({ action: 'UPDATE_TRUCK_ORDER_STATUS', module: 'TRUCK_ORDER' })
  async updateStatus(
    @Param() param,
    @Body(new YupValidationPipe(updateStatusSchema)) body: TruckOrderDto,
    @Response() res,
  ): Promise<[]> {
    const { truckOrderId } = param
    const data = await this.truckOrderService.updateStatusOrder(truckOrderId, body, 'order');
    return res.status(200).json({
      message: 'Order status update successfully',
      data,
      statusCode: 200,
    });
  }
  @Patch('status/rfq/:truckOrderId')
  @AuditLog({ action: 'UPDATE_TRUCK_ORDER_RFQ_STATUS', module: 'TRUCK_ORDER' })
  async updateRfqStatus(
    @Param() param,
    @Body(new YupValidationPipe(updateRfqStatusSchema)) body: TruckOrderDto,
    @Response() res,
  ): Promise<[]> {
    const { truckOrderId } = param
    const data = await this.truckOrderService.updateStatusOrder(truckOrderId, body, 'rfq');
    return res.status(200).json({
      message: 'Order status update successfully',
      data,
      statusCode: 200,
    });
  }
  @Patch('price/:truckOrderId')
  @AuditLog({ action: 'UPDATE_TRUCK_ORDER_PRICE', module: 'TRUCK_ORDER' })
  async updatePrice(
    @Param() param,
    @Body(new YupValidationPipe(updatePriceSchema)) body: TruckOrderDto,
    @Response() res,
  ): Promise<[]> {
    const { truckOrderId } = param
    const data = await this.truckOrderService.updatePriceOrder(truckOrderId, body);
    return res.status(200).json({
      message: 'Order price update successfully',
      data,
      statusCode: 200,
    });
  }
  @Delete(':truckOrderId')
  @AuditLog({ action: 'DELETE_TRUCK_ORDER', module: 'TRUCK_ORDER' })
  async delete(
    @Param() param,
    @Response() res,
  ): Promise<[]> {
    const { truckOrderId } = param
    await this.truckOrderService.deleteOrder(truckOrderId);
    return res.status(200).json({
      message: 'Truck Order deleted successfully',
      statusCode: 200,
    });
  }

  @Get('admin/all')
  async getAllOrdersAdmin(
    @Query() query: TruckOrderQueryDto,
    @Request() req,
    @Response() res,
  ): Promise<[]> {
    const { user } = req;
    const data = await this.truckOrderService.getAllOrdersAdmin(query, user);
    return res.status(200).json({
      message: 'All Truck Orders fetched successfully (Admin)',
      data,
      statusCode: 200,
    });
  }

  @Get('profile/:profileId/:profileType')
  async getOrdersByProfile(
    @Param('profileId') profileId: string,
    @Param('profileType') profileType: 'buyer' | 'seller' | 'transporter',
    @Query() query: TruckOrderQueryDto,
    @Request() req,
    @Response() res,
  ): Promise<[]> {
    const { user } = req;
    const data = await this.truckOrderService.getOrdersByProfile(profileId, profileType, query, user);
    return res.status(200).json({
      message: `Orders for ${profileType} profile fetched successfully`,
      data,
      statusCode: 200,
    });
  }
}