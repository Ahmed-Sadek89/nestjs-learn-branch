import { IsOptional, IsString } from "class-validator"

export class FilterClientDto {
    @IsOptional()
    @IsString()
    search?: string
}
