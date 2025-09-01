import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Request, Response, UseGuards } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { AuditLog } from 'src/shared/decorators/audit-log.decorator';
import { OrderDto, OrderQueryDto, OrderUpdateDto } from '../dto/order.dto';
import { OrderDtoSchema, OrderUpdateDtoSchema } from '../validations/order.validation';

@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Get()
  async getAll(@Query() query: OrderQueryDto, @Request() req, @Response() res) {
    const { user } = req;
    console.log(user, "gggg")
    const data = await this.orderService.getAllOrder(query, user);
    return res.status(200).json({
      message: 'Orders fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get('admin/all')
  async getAllOrdersAdmin(@Query() query: OrderQueryDto, @Request() req, @Response() res) {
    const { user } = req;
    const data = await this.orderService.getAllOrderAdmin(query, user);
    return res.status(200).json({
      message: 'All Orders fetched successfully (Admin)',
      data,
      statusCode: 200,
    });
  }

  @Get('get-orders-count')
  async getOrdersCount(@Query() query: OrderQueryDto, @Response() res) {
    const data = await this.orderService.getOrderCount(query);
    return res.status(200).json({
      message: 'Orders count fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Post()
  @AuditLog({ action: 'CREATE_ORDER', module: 'ORDER' })
  async create(
    @Request() req,
    @Body(new YupValidationPipe(OrderDtoSchema)) body: OrderDto,
    @Response() res,
  ) {
    console.log(body, "body")
    const { user } = req;
    console.log(user, "user before create order")
    const data = await this.orderService.createOrder(body, user);
    return res.status(200).json({
      message: 'Order created successfully',
      data,
      statusCode: 200,
    });
  }

  @Get(':orderId')
  async getOne(@Param('orderId') orderId: string, @Response() res) {
    const data = await this.orderService.getOneOrder(orderId);
    return res.status(200).json({
      message: 'Order fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Patch('update/:orderId')
  @AuditLog({ action: 'UPDATE_ORDER', module: 'ORDER' })
  async updateOrder(
    @Param('orderId') orderId: string,
    @Body(new YupValidationPipe(OrderUpdateDtoSchema)) body: OrderUpdateDto,
    @Request() req,
    @Response() res,
  ) {
    const data = await this.orderService.updateOrder(orderId, body, req.user);
    return res.status(200).json({
      message: `Order ${body.description.replace('_', ' ')} successfully`,
      data,
      statusCode: 200,
    });
  }


  // @Patch('status/:orderId')
  // @AuditLog({ action: 'UPDATE_ORDER_STATUS', module: 'ORDER' })
  // async updateStatus(
  //     @Param('orderId') orderId: string,
  //     @Body(new YupValidationPipe(updateStatusSchema)) body: OrderDto,
  //     @Response() res,
  // ) {
  //     const data = await this.orderService.updateStatusOrder(orderId, body);
  //     return res.status(200).json({
  //         message: 'Order status updated successfully',
  //         data,
  //         statusCode: 200,
  //     });
  // }

  // @Patch('price/:orderId')
  // @AuditLog({ action: 'UPDATE_ORDER_PRICE', module: 'ORDER' })
  // async updatePrice(
  //     @Param('orderId') orderId: string,
  //     @Body(new YupValidationPipe(updatePriceSchema)) body: OrderDto,
  //     @Response() res,
  // ) {
  //     const data = await this.orderService.updatePriceOrder(orderId, body);
  //     return res.status(200).json({
  //         message: 'Order price updated successfully',
  //         data,
  //         statusCode: 200,
  //     });
  // }

  @Delete(':orderId')
  @AuditLog({ action: 'DELETE_ORDER', module: 'ORDER' })
  async delete(@Param('orderId') orderId: string, @Response() res) {
    await this.orderService.deleteOrder(orderId);
    return res.status(200).json({
      message: 'Order deleted successfully',
      statusCode: 200,
    });
  }

  // @Patch('rfq/:orderId')
  // @AuditLog({ action: 'UPDATE_ORDER_RFQ_STATUS', module: 'ORDER' })
  // async updateRfqStatus(
  //     @Param('orderId') orderId: string,
  //     @Body(new YupValidationPipe(updateStatusSchema)) body: OrderDto,
  //     @Response() res,
  // ) {
  //     const data = await this.orderService.updateRfqStatusOrder(orderId, body);
  //     return res.status(200).json({
  //         message: 'Order RFQ status updated successfully',
  //         data,
  //         statusCode: 200,
  //     });
  // }

  // @Post('reject/:orderId')
  // @AuditLog({ action: 'REJECT_ORDER_AND_CREATE_NEGOTIATION', module: 'ORDER' })
  // async rejectAndCreateNegotiation(
  //     @Param('orderId') orderId: string,
  //     @Body() body: { price: number },
  //     @Request() req,
  //     @Response() res,
  // ) {
  //     const { user } = req;
  //     const data = await this.orderService.rejectAndCreateNegotiation(orderId, body, user);
  //     return res.status(200).json({
  //         message: 'Order rejected and negotiation created successfully',
  //         data,
  //         statusCode: 200,
  //     });
  // }
}
