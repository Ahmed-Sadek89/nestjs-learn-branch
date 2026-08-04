import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  async create(@Body() createProfileDto: CreateProfileDto) {
    return await this.profileService.create(createProfileDto);
  }

  @Get()
  async findAll() {
    return await this.profileService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.profileService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return await this.profileService.update(+id, updateProfileDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.profileService.remove(+id);
  }
}
