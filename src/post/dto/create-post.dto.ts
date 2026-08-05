import { IsNotEmpty, IsNumber, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePostDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(50)
    title!: string

    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(255)
    description!: string

    @IsNumber()
    @IsNotEmpty()
    client_id!: number

    @IsNumber()
    @IsNotEmpty()
    profile_id!: number
}
