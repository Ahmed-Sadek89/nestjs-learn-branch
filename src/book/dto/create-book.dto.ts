import { IsBoolean, IsDefined, IsNumber, IsOptional, IsString, MaxLength, maxLength, Min, MinLength } from "class-validator";

export class CreateBookDto {
    @IsString()
    @MinLength(3, {
        message: "Title must be at least 3 characters long",
    })
    @MaxLength(50, {
        message: "Title must be at most 50 characters long",
    })
    title!: string

    @IsString()
    @IsOptional()
    @MaxLength(100, {
        message: "Description must be at most 100 characters long",
    })
    description!: string;

    @IsString()
    @MinLength(3, {
        message: "Author must be at least 3 characters long",
    })
    @MaxLength(100, {
        message: "Author must be at most 100 characters long",
    })
    author!: string;

    @IsNumber()
    @Min(0, {
        message: "Price must be greater than 0",
    })
    price!: number;


    @IsBoolean({
        message: "Is published must be a boolean",
    })
    isPublished!: boolean;
}