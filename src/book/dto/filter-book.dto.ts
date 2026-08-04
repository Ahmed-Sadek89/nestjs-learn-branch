import { Transform, Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class FilterBookDto {
    @IsString()
    @IsOptional()
    search?: string;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    minPrice?: number;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @IsOptional()
    maxPrice?: number;

    @Transform(({ value }) => {
        if (value === "true" || value === true) return true;
        if (value === "false" || value === false) return false;
        return value;
    })
    @IsBoolean()
    @IsOptional()
    isPublished?: boolean;
}
