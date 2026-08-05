import { IsNumber, IsPositive, IsString, MaxLength, MinLength } from "class-validator";

export class CreateTagDto {
    @IsString()
    @MinLength(2)
    @MaxLength(20)
    name!: string

    @IsNumber()
    @IsPositive()
    post_id!: number
}
