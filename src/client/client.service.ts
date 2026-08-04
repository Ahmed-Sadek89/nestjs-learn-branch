import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>
  ) { }

  async create(createClientDto: CreateClientDto) {
    try {
      const client = this.clientRepo.create(createClientDto);
      await this.clientRepo.save(client);
      return {
        message: "Client created successfully",
        data: client
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error creating client");
    }
  }

  async findAll() {
    try {
      const all = await this.clientRepo.find();
      return {
        total: all.length,
        data: all
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error finding clients");
    }
  }

  async findOne(email: string) {
    try {
      const data = await this.clientRepo.findOne({ where: { email } });
      return {
        message: "Client found successfully",
        data: data
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error finding client");
    }
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    try {
      const updatedClient = await this.clientRepo.update(id, updateClientDto);
      return {
        message: "Client updated successfully",
        data: updatedClient
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error updating client");
    }
  }

  async remove(id: number) {
    try {
      const deletedClient = await this.clientRepo.delete(id);
      return {
        message: "Client deleted successfully",
        data: deletedClient
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error deleting client");
    }
  }
}
