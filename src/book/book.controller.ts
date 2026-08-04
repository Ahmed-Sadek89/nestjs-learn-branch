import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BookService } from './book.service';
import { CreateBookDto } from './dto/create-book.dto';
import { FilterBookDto } from './dto/filter-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Controller('books')
export class BookController {
    constructor(private readonly bookService: BookService) { }

    @Get()
    async getAll(@Query() dto: FilterBookDto) {
        return await this.bookService.getAll(dto);
    }

    @Post()
    async create(@Body() dto: CreateBookDto) {
        return await this.bookService.create(dto);
    }

    @Get(":id")
    async findOne(@Param("id") id: number) {
        return await this.bookService.findOne(id)
    }

    @Patch(":id")
    async updateById(@Param("id") id: number, @Body() dto: UpdateBookDto) {
        return await this.bookService.updateById(id, dto)
    }

    @Delete(":id")
    async deleteById(@Param("id") id: number) {
        return await this.bookService.deleteById(id)
    }
}
