import { OrderDto, OrderQueryDto } from "../dto/order.dto";
import { OrderService } from "../services/order.service";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, Response } from "@nestjs/common";
import { orderSchema, updatePriceSchema, updateStatusSchema } from "../validations/order.validation";
import { YupValidationPipe } from "src/shared/pipes/yup-validation.pipe";

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Get()
  async getAll(
    @Query() query: OrderQueryDto,
    @Response() res,
  ): Promise<[]> {
    const data = await this.orderService.getAllOrders(query);
    return res.status(200).json({
      message: 'Orders fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get('get-orders-count')
  async getOrdersCount(
    @Query() query: OrderQueryDto,
    @Response() res,
  ): Promise<[]> {
    const data = await this.orderService.getOrdersCount(query)
    return res.status(200).json({
      message: 'Orders count fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get(':orderId')
  async getOne(
    @Param() param,
    @Response() res,
  ): Promise<[]> {
    const { orderId } = param
    const data = await this.orderService.getOneOrder(orderId);
    return res.status(200).json({
      message: 'Order fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Post()
  async create(
    @Request() req,
    @Body(new YupValidationPipe(orderSchema)) body: OrderDto,
    @Response() res,
  ): Promise<[]> {
    const { user } = req
    const data = await this.orderService.createNewOrder(body, user);
    return res.status(200).json({
      message: 'Order created successfully',
      data,
      statusCode: 200,
    });
  }

  @Patch('status/:orderId')
  async updateStatus(
    @Param() param,
    @Body(new YupValidationPipe(updateStatusSchema)) body: OrderDto,
    @Response() res,
  ): Promise<[]> {
    const { orderId } = param
    const data = await this.orderService.updateStatusOrder(orderId, body);
    return res.status(200).json({
      message: 'Order status update successfully',
      data,
      statusCode: 200,
    });
  }

  @Patch('price/:orderId')
  async updatePrice(
    @Param() param,
    @Body(new YupValidationPipe(updatePriceSchema)) body: OrderDto,
    @Response() res,
  ): Promise<[]> {
    const { orderId } = param
    const data = await this.orderService.updatePriceOrder(orderId, body);
    return res.status(200).json({
      message: 'Order price update successfully',
      data,
      statusCode: 200,
    });
  }

  @Delete(':orderId')
  async delete(
    @Param() param,
    @Response() res,
  ): Promise<[]> {
    const { orderId } = param
    await this.orderService.deleteOrder(orderId);
    return res.status(200).json({
      message: 'Order deleted successfully',
      statusCode: 200,
    });
  }
}