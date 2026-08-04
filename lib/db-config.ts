import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export const dbConfig:TypeOrmModuleOptions = {
    type: "postgres",
    host: 'localhost',
    port: parseInt('5432'),
    username: 'typeorm_user',
    password: '1234',
    database: 'typeorm_database',
    autoLoadEntities: true,
    logging: true,
    synchronize: true,
}