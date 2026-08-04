import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { QueryFailedError, Repository } from 'typeorm';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) { }
  async create(createProfileDto: CreateProfileDto) {
    try {
      const profile = this.profileRepo.create({
        bio: createProfileDto.bio,
        client: { id: createProfileDto.client_id },
      });
      await this.profileRepo.save(profile);
      return {
        message: "Profile created successfully",
        data: profile
      };
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string } | undefined)?.code;
        if (code === '23503') {
          throw new NotFoundException(
            `Client with id ${createProfileDto.client_id} was not found`,
          );
        }
        if (code === '23505') {
          throw new ConflictException(
            `Client with id ${createProfileDto.client_id} already has a profile`,
          );
        }
      }
      throw new BadRequestException(
        error instanceof Error ? error.message : "Error creating profile",
      );
    }
  }

  async findAll() {
    try {
      const all = await this.profileRepo.find();
      return {
        total: all.length,
        data: all
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error finding profiles");
    }
  }

  async findOne(id: number) {
    try {
      const profile = await this.profileRepo.findOne({ where: { id } });
      return {
        message: "Profile found successfully",
        data: profile
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error finding profile");
    }
  }

  async update(id: number, updateProfileDto: UpdateProfileDto) {
    try {
      const updatedProfile = await this.profileRepo.update(id, updateProfileDto);
      return {
        message: "Profile updated successfully",
        data: updatedProfile
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error updating profile");
    }
  }

  async remove(id: number) {
    try {
      const deletedProfile = await this.profileRepo.delete(id);
      return {
        message: "Profile deleted successfully",
        data: deletedProfile
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error deleting profile");
    }
  }
}
