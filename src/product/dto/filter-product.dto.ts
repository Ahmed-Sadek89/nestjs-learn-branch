import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ProductCategory } from "../product.model";
import { Type } from "class-transformer";

export class FilterProductDto {
    @IsOptional()
    @IsEnum(ProductCategory, {
        message: `The category must be one of the following: ${Object.values(ProductCategory).join(', ')}`
    })
    category?: ProductCategory

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    minPrice?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    maxPrice?: number;
}