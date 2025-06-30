import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './entities/product.entity';
import { ProductService } from './services/product.service';
import { ProductRepository } from './repositories/product.repository';
import { ProductController } from './controllers/product.controller';
import { ProductSeedService } from './seeders/product.seeder';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, ProductSeedService],
  exports: [ProductSeedService, ProductService, ProductRepository],
})
export class ProductModule { }
