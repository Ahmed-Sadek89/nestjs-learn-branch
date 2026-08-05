import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSourceOptions } from "typeorm";

/** Shared Postgres connection — used by Nest and the seed DataSource */
export const dbConnection: DataSourceOptions = {
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "typeorm_user",
  password: "1234",
  database: "typeorm_database",
  logging: true,
  synchronize: true,
};

export const dbConfig: TypeOrmModuleOptions = {
  ...dbConnection,
  autoLoadEntities: true,
};
