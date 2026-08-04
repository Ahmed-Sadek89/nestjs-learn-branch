import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Book } from './book.entity';
import {
    Between,
    FindOptionsWhere,
    ILike,
    LessThanOrEqual,
    MoreThanOrEqual,
    Repository,
} from 'typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { FilterBookDto } from './dto/filter-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@Injectable()
export class BookService {
    constructor(
        @InjectRepository(Book)
        private readonly bookRepo: Repository<Book>
    ) { }

    async getAll(dto: FilterBookDto) {
        const { search, minPrice, maxPrice, isPublished } = dto;

        const filters: FindOptionsWhere<Book> = {};
        if (minPrice != null && maxPrice != null) {
            filters.price = Between(minPrice, maxPrice);
        } else if (minPrice != null) {
            filters.price = MoreThanOrEqual(minPrice);
        } else if (maxPrice != null) {
            filters.price = LessThanOrEqual(maxPrice);
        }

        if (isPublished != null) {
            filters.isPublished = isPublished;
        }
        console.log({ filters })
        const where: FindOptionsWhere<Book> | FindOptionsWhere<Book>[] = search
            ? [
                { title: ILike(`%${search}%`), ...filters },
                { author: ILike(`%${search}%`), ...filters },
                { description: ILike(`%${search}%`), ...filters },
            ]
            : filters;

        const data = await this.bookRepo.find({ where });
        return {
            data,
            total: data.length,
        };
    }


    async create(dto: CreateBookDto) {
        try {
            const book = this.bookRepo.create(dto);
            await this.bookRepo.save(book);
            return {
                message: "Book created successfully",
                data: book,
            }
        } catch (error) {
            throw new BadRequestException((error as Error).message);
        }
    }

    async findOne(id: number) {
        const book = await this.bookRepo.findOne({ where: { id } });
        if (!book) {
            throw new NotFoundException("Book not found");
        }
        return book;
    }

    async updateById(id: number, dto: UpdateBookDto) {
        try {
            await this.bookRepo.update({ id }, dto)
            return {
                message: "Book updated successfully",
            }
        } catch (error) {
            throw new BadRequestException((error as Error).message);
        }
    }

    async deleteById(id: number) {
        try {
            await this.bookRepo.delete({ id })
            return {
                message: "Book deleted successfully",
            }
        } catch (error) {
            throw new BadRequestException((error as Error).message);
        }
    }
}
