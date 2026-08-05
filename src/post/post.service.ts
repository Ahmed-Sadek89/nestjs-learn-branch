import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from './entities/post.entity';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) { }
  async create(createPostDto: CreatePostDto) {
    try {
      const post = this.postRepository.create({
        title: createPostDto.title,
        description: createPostDto.description,
        client: { id: createPostDto.client_id },
        profile: { id: createPostDto.profile_id },
      });
      return this.postRepository.save(post);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Error creating post",
      );
    }
  }

  async findAll() {
    try {
      const posts = await this.postRepository.find({
        // relations: {
        //   client: true,
        //   profile: true,
        // },
      });
      return {
        message: "Posts found successfully",
        data: posts,
      };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Error finding posts",
      );
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} post`;
  }

  update(id: number, updatePostDto: UpdatePostDto) {
    return `This action updates a #${id} post`;
  }

  remove(id: number) {
    return `This action removes a #${id} post`;
  }
}
