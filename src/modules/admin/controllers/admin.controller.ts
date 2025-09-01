import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  Response,
} from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { AdminDto } from '../dto/admin.dto';
import { adminSchema } from '../validations/admin.validation';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('onboarding')
  async createAdminInfo(
    @Body(new YupValidationPipe(adminSchema)) body: AdminDto,
    @Request() req,
    @Response() res,
  ): Promise<AdminDto> {
    const adminData = await this.adminService.saveNewAdminInfo(body, req.user);
    return res.status(200).json({
      message: 'Admin Information saved successfully',
      data: adminData,
      statusCode: 200,
    });
  }

  @Get('analytics')
  async getAdminAnalytics(@Request() req, @Response() res): Promise<any> {
    const { user } = req;
    const data = await this.adminService.getAnalytics(user);
    return res.status(200).json({
      message: 'Admin analytics fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get('analytics/recent')
  async getRecentAdminAnalytics(
    @Request() req,
    @Response() res,
    @Query('date') date: string,
  ): Promise<any> {
    const { user } = req;
    const data = await this.adminService.getRecentAnalyticsByDate(user, date);
    return res.status(200).json({
      message: 'Recent data fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get('analytics/recent/users')
  async getRecentUsers(
    @Request() req,
    @Response() res,
    @Query('date') date: string,
  ): Promise<any> {
    const { user } = req;
    const data = await this.adminService.getUserDataByDate(user, date);
    return res.status(200).json({
      message: 'Recent users fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get('analytics/recent/product-uploads')
  async getRecentProductUploads(
    @Request() req,
    @Response() res,
    @Query('date') date: string,
  ): Promise<any> {
    const { user } = req;
    const data = await this.adminService.getProductUploadDataByDate(user, date);
    return res.status(200).json({
      message: 'Recent product uploads fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get('analytics/recent/orders')
  async getRecentOrders(
    @Request() req,
    @Response() res,
    @Query('date') date: string,
  ): Promise<any> {
    const { user } = req;
    const data = await this.adminService.getOrderDataByDate(user, date);
    return res.status(200).json({
      message: 'Recent orders fetched successfully',
      data,
      statusCode: 200,
    });
  }

  // @Get('analytics/recent/truck-orders')
  // async getRecentTruckOrders(
  //   @Request() req,
  //   @Response() res,
  //   @Query('date') date: string,
  // ): Promise<any> {
  //   const { user } = req;
  //   const data = await this.adminService.getTruckOrderDataByDate(user, date);
  //   return res.status(200).json({
  //     message: 'Recent truck orders fetched successfully',
  //     data,
  //     statusCode: 200,
  //   });
  // }
}
