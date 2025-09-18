import { CalculateFareDto } from './../dto/calculate-fare.dto';

// DTO for updating a distance
export class UpdateDistanceDto {
  state?: string;
  lga?: string;
  loadPoint?: string;
  distanceKM?: number;
}
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Response,
} from '@nestjs/common';
import { TransportFareService } from '../services/transport-fare.service';
import { BulkUploadDistanceDto, CreateLoadPointDto } from '../dto/calculate-fare.dto';
import { CreateTransportConfigDto, UpdateTransportConfigDto } from '../dto/transport-config.dto';
import { Public } from 'src/shared/decorators/public.route.decorator';


@Public()
@Controller('transport-fare')
export class TransportFareController {
  constructor(private readonly transportFareService: TransportFareService) {}

  @Put('admin/distances/:id')
  async editDistance(
    @Param('id') id: string,
    @Body() updateDto: UpdateDistanceDto,
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;

    // console.log(updateDto, "updateDto", id)
    const updated = await this.transportFareService.editDistance(id, updateDto);
    return res.status(200).json({
      message: 'Distance updated successfully',
      data: updated,
      statusCode: 200,
    });
  }


  @Post('calculate')
  async calculateFare(
    @Body() calculateFareDto: CalculateFareDto,
    @Response() res,
  ) {
    console.log(calculateFareDto);
    const result = await this.transportFareService.calculateTankerFare(calculateFareDto);
    console.log(result, "result")
    return res.status(200).json({
      message: 'Fare calculated successfully',
      data: result,
      statusCode: 200,
    });
  }

  // Admin endpoints
  @Post('admin/config')
  async createConfig(
    @Body() createConfigDto: CreateTransportConfigDto,
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    const config = await this.transportFareService.createConfig(createConfigDto);
    return res.status(201).json({
      message: 'Configuration created successfully',
      data: config,
      statusCode: 201,
    });
  }

  @Public()
  @Get('admin/config')
  async getAllConfigs(
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    const configs = await this.transportFareService.getAllConfigs();
    return res.status(200).json({
      message: 'Configurations retrieved successfully',
      data: configs,
      statusCode: 200,
    });
  }

  @Put('admin/config/:key')
  async updateConfig(
    @Param('key') key: string,
    @Body() updateConfigDto: UpdateTransportConfigDto,
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    const config = await this.transportFareService.updateConfig(key, updateConfigDto);
    return res.status(200).json({
      message: 'Configuration updated successfully',
      data: config,
      statusCode: 200,
    });
  }

  @Delete('admin/config/:key')
  async deleteConfig(
    @Param('key') key: string,
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    await this.transportFareService.deleteConfig(key);
    return res.status(200).json({
      message: 'Configuration deleted successfully',
      data: null,
      statusCode: 200,
    });
  }

  // Distance management endpoints
  @Post('admin/distances/bulk-upload')
  async bulkUploadDistances(
    @Body() distances: BulkUploadDistanceDto[],
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    console.log(distances, "distances")
    const result = await this.transportFareService.bulkUploadDistances(distances);
    // console.log(result, "result")
    return res.status(200).json({
      message: 'Distances uploaded successfully',
      data: result,
      statusCode: 200,
    });
  }

  @Get('admin/distances')
  async getAllDistances(
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    const distances = await this.transportFareService.getAllDistances();
    return res.status(200).json({
      message: 'Distances retrieved successfully',
      data: distances,
      statusCode: 200,
    });
  }

  @Delete('admin/distances/:id')
  async deleteDistance(
    @Param('id') id: string,
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    await this.transportFareService.deleteDistance(id);
    return res.status(200).json({
      message: 'Distance deleted successfully',
      data: null,
      statusCode: 200,
    });
  }

  // Load point management endpoints
  @Post('admin/load-points')
  async createLoadPoint(
    @Body() createLoadPointDto: CreateLoadPointDto,
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    const loadPoint = await this.transportFareService.createLoadPoint(createLoadPointDto);
    return res.status(201).json({
      message: 'Load point created successfully',
      data: loadPoint,
      statusCode: 201,
    });
  }

  @Get('load-points')
  async getAllLoadPoints(@Response() res) {
    const loadPoints = await this.transportFareService.getAllLoadPoints();
    return res.status(200).json({
      message: 'Load points retrieved successfully',
      data: loadPoints,
      statusCode: 200,
    });
  }

  @Put('admin/load-points/:id')
  async updateLoadPoint(
    @Param('id') id: string,
    @Body() updateDto: CreateLoadPointDto,
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    const updated = await this.transportFareService.updateLoadPoint(id, updateDto);
    return res.status(200).json({
      message: 'Load point updated successfully',
      data: updated,
      statusCode: 200,
    });
  }
  
  @Delete('admin/load-points/:id')
  async deleteLoadPoint(
    @Param('id') id: string,
    @Request() req,
    @Response() res,
  ) {
    // const { user } = req;
    await this.transportFareService.deleteLoadPoint(id);
    return res.status(200).json({
      message: 'Load point deleted successfully',
      data: null,
      statusCode: 200,
    });
  }

  // Seeding endpoints
  // @Post('admin/seed/configs')
  // async seedDefaultConfigs(
  //   @Request() req,
  //   @Response() res,
  // ) {
  //   // const { user } = req;
  //   await this.transportFareService.seedDefaultConfigs();
  //   return res.status(200).json({
  //     message: 'Default configurations seeded successfully',
  //     data: null,
  //     statusCode: 200,
  //   });
  // }

  // @Post('admin/seed/load-point')
  // async seedDefaultLoadPoint(
  //   @Request() req,
  //   @Response() res,
  // ) {
  //   // const { user } = req;
  //   await this.transportFareService.seedDefaultLoadPoint();
  //   return res.status(200).json({
  //     message: 'Default load point seeded successfully',
  //     data: null,
  //     statusCode: 200,
  //   });
  // }
}
