import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { Repository } from 'typeorm';
import { FilterClientDto } from './dto/filter-client.dto';
import { paginate } from 'src/common/pagination';

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
      const { password: _, ...safe } = client;
      return {
        message: "Client created successfully",
        data: safe
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : "Error creating client");
    }
  }

  async findAll(query: FilterClientDto) {
    try {
      return await paginate(this.clientRepo, query);
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

  async findByEmail(email: string) {
    try {
      const data = await this.clientRepo.findOne({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
        }
      });
      if (!data) {
        return null;
      }
      return {
        message: "Client found successfully",
        data: data
      };
    }
    catch (error) {
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
