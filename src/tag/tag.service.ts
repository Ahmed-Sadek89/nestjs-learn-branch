import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Tag } from './entities/tag.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>
  ) {

  }
  async create(createTagDto: CreateTagDto) {
    try {
      const newtag = await this.tagRepo.create({
        name: createTagDto.name,
        posts: [{ id: createTagDto.post_id }]
      })
      return await this.tagRepo.save(newtag);
    } catch (error: any) {
      throw new InternalServerErrorException("Failed to create tag", error);
    }
  }

  async findAll() {
    try {
      return await this.tagRepo.find({
        relations: {
          posts: true,
        },
      });
    } catch (error: any) {
      throw new InternalServerErrorException("Failed to get tags", error);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} tag`;
  }

  update(id: number, updateTagDto: UpdateTagDto) {
    return `This action updates a #${id} tag`;
  }

  remove(id: number) {
    return `This action removes a #${id} tag`;
  }
}
