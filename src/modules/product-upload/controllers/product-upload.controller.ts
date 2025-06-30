import { ProductUploadDto, ProductUploadQueryDto } from "../dto/product-upload.dto";
import { ProductUploadService } from "../services/product-upload.service";
import { productUploadSchema } from "../validations/product-upload.validation";
import { YupValidationPipe } from "src/shared/pipes/yup-validation.pipe";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, Response } from "@nestjs/common";

@Controller('product-upload')
export class ProductUploadController {
  constructor(private readonly productService: ProductUploadService) { }

  @Get()
  async getAll(
    @Query() query: ProductUploadQueryDto,
    @Response() res,
  ): Promise<ProductUploadDto[]> {
    const data = await this.productService.getAllProductUploads(query);
    return res.status(200).json({
      message: 'Products fetched successfully',
      data,
      statusCode: 200,
    });
  }

  @Get(':productId')
  async getOne(
    @Param() param,
    @Response() res,
  ): Promise<ProductUploadDto> {
    const { productId } = param
    const product = await this.productService.getProductUploadDetail(productId)
    return res.status(200).json({
      message: 'Product fetched successfully',
      data: product,
      statusCode: 200,
    });
  }

  @Post()
  async create(
    @Body(new YupValidationPipe(productUploadSchema)) body: ProductUploadDto,
    @Request() req,
    @Response() res,
  ): Promise<ProductUploadDto> {
    const { user } = req
    const productData = await this.productService.saveNewProductUploadData(body, user);
    return res.status(200).json({
      message: 'Product Information saved successfully',
      data: productData,
      statusCode: 200,
    });
  }

  @Put(':productId')
  async update(
    @Request() req,
    @Body(new YupValidationPipe(productUploadSchema)) body: ProductUploadDto,
    @Param() param,
    @Response() res
  ): Promise<ProductUploadDto> {
    const { productId } = param;
    const { user } = req
    const data = await this.productService.updateProductUploadData(productId, body, user);
    return res.status(200).json({
      message: 'Product updated successfully',
      data,
      statusCode: 200,
    });
  }

  @Delete(':productId')
  async delete(
    @Param() param,
    @Response() res
  ): Promise<ProductUploadDto> {
    const { productId } = param;
    await this.productService.deleteProductUploadData(productId);
    return res.status(200).json({
      message: 'Product deleted successfully',
      statusCode: 200,
    });
  }
}