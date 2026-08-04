import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

export class CreateClientDto {
    @IsString({
        message: "The name must be a string"
    })
    @MaxLength(50, {
        message: "The name must be less than 50 characters"
    })
    @MinLength(3, {
        message: "The name must be at least 3 characters"
    })
    name!: string


    @IsEmail({
        allow_display_name: true,
        allow_utf8_local_part: true,
        require_tld: true,
    }, {
        message: "The email must be a valid email"
    }) 
    email!: string
}
