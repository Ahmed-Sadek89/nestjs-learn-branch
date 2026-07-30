import { ArrayMaxSize, arrayMaxSize, ArrayNotEmpty, IsArray, isArray, IsEnum, IsNumber, IsOptional, isString, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { ProductCategory } from "../product.model";

export class CreateProductDto {
    @IsString({
        message: "The name must be a string"
    })
    @MinLength(3, {
        message: "The name must be at least 3 characters long"
    })
    @MaxLength(20, {
        message: "The name must be at most 20 characters long"
    })
    name!: string;

    @IsString({
        message: "The description must be a string"
    })
    @MinLength(10, {
        message: "The description must be at least 10 characters long"
    })
    @MaxLength(100, {
        message: "The description must be at most 100 characters long"
    })
    description!: string;

    @IsNumber({
        maxDecimalPlaces: 2,
    })
    @Min(0, {
        message: "The price must be greater than 0"
    })
    @Max(1000000, {
        message: "The price must be less than 1000000"
    })
    price!: number;

    @IsOptional()
    @IsNumber()
    @Min(0, {
        message: "The stock must be greater than 0"
    })
    @Max(100_000, {
        message: "The stock must be less than 100000"
    })
    stock!: number;

    @IsEnum(ProductCategory, {
        message: `The category must be one of the following: ${Object.values(ProductCategory).join(', ')}`
    })
    category!: ProductCategory;


    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(10)
    @IsString({ each: true })
    @MinLength(1, { each: true })
    tags!: string[];
}
