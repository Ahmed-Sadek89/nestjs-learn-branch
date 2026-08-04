import { IsNumber, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProfileDto {

    @IsString({
        message: "The bio must be a string"
    })
    @MinLength(3, {
        message: "The bio must be at least 3 characters"
    })
    @MaxLength(50, {
        message: "The bio must be less than 50 characters"
    })
    bio!: string

    @IsNumber()
    client_id!: number
}
