import { ProductDto, ProductQueryDto } from "../dto/product.dto";
import { ProductService } from "../services/product.service";
import { productSchema } from "../validations/product.validation";
import { YupValidationPipe } from "src/shared/pipes/yup-validation.pipe";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Response } from "@nestjs/common";

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Get()
  async getAll(
    @Query() query: ProductQueryDto,
    @Response() res,
  ): Promise<ProductDto[]> {
    const data = await this.productService.getAllProducts(query);
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
  ): Promise<ProductDto> {
    const { productId } = param
    const product = await this.productService.getProductDetail(productId)
    return res.status(200).json({
      message: 'Product fetched successfully',
      data: product,
      statusCode: 200,
    });
  }

  @Post()
  async create(
    @Body(new YupValidationPipe(productSchema)) body: ProductDto,
    @Response() res,
  ): Promise<ProductDto> {
    const productData = await this.productService.saveNewProductData(body);
    return res.status(200).json({
      message: 'Product Information saved successfully',
      data: productData,
      statusCode: 200,
    });
  }

  @Put(':productId')
  async update(
    @Body(new YupValidationPipe(productSchema)) body: ProductDto,
    @Param() param,
    @Response() res
  ): Promise<ProductDto> {
    const { productId } = param;
    const data = await this.productService.updateProductData(productId, body);
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
  ): Promise<ProductDto> {
    const { productId } = param;
    await this.productService.deleteProductData(productId);
    return res.status(200).json({
      message: 'Product deleted successfully',
      statusCode: 200,
    });
  }
}