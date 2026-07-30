import { Injectable, NotFoundException } from '@nestjs/common';
import { Product, ProductResponse } from './product.model';
import { FilterProductDto } from './dto/filter-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { randomUUID } from 'crypto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
    private products: Product[] = [];



    create(dto: CreateProductDto): Product {
        const payload: Product = {
            id: randomUUID(),
            name: dto.name,
            description: dto.description,
            price: dto.price,
            stock: dto.stock,
            category: dto.category,
            tags: dto.tags,
            createdAt: new Date()
        }

        this.products.push(payload);

        return payload;
    }

    findAll(filter: FilterProductDto): ProductResponse {
        let res = [...this.products];

        if (filter.category) {
            res = res.filter(product => product.category === filter.category);
        }

        if (filter.search) {
            const search = filter.search.toLowerCase();
            res = res.filter(product =>
                product.name.toLowerCase().includes(search) ||
                product.description.toLowerCase().includes(search) ||
                product.tags.some(tag => tag.toLowerCase().includes(search))
            );
        }

        if (filter.minPrice) {
            res = res.filter(product => product.price >= filter.minPrice!);
        }

        if (filter.maxPrice) {
            res = res.filter(product => product.price <= filter.maxPrice!);
        }

        return {
            data: res,
            total: res.length,

        };
    }

    findOne(id: string): Product {
        const product = this.products.find(product => product.id === id) ?? null;
        if (!product) {
            throw new NotFoundException('Product not found');
        }
        return product;
    }

    deleteOne(id: string): { message: string } {
        this.products = this.products.filter(product => product.id !== id);
        return {
            message: "Product deleted successfully",
        }
    }

    deleteAll(): { message: string } {
        this.products = [];
        return {
            message: "All products deleted successfully",
        }
    }

    updateOne(id: string, dto: UpdateProductDto): Product {
        const target = this.findOne(id);
        Object.assign(target, dto);
        return target;
    }
}
