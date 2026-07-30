import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { FilterProductDto } from './dto/filter-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import type { Product, ProductResponse } from './product.model';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductController {
    constructor(
        private readonly productService: ProductService
    ) { }

    @Get()
    findAll(@Query() filter: FilterProductDto): ProductResponse {
        return this.productService.findAll(filter)
    }

    @Post()
    create(@Body() dto: CreateProductDto): Product {
        return this.productService.create(dto)
    }

    @Get(":id")
    findOne(@Param("id") id: string): Product {
        return this.productService.findOne(id)
    }

    @Delete(":id")
    deleteOne(@Param("id") id: string): { message: string } {
        return this.productService.deleteOne(id)
    }

    @Delete()
    deleteAll(): { message: string } {
        return this.productService.deleteAll()
    }

    @Patch(":id")
    updateOne(@Param("id") id: string, @Body() dto: UpdateProductDto): Product {
        return this.productService.updateOne(id, dto)
    }
}
