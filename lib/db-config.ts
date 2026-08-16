import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { DataSourceOptions } from "typeorm";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

/** Shared Postgres connection — used by Nest and the seed DataSource */
export const dbConnection: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  logging: (process.env.TYPEORM_LOGGING ?? "true") === "true",
  synchronize: (process.env.TYPEORM_SYNC ?? "true") === "true",
};

export const dbConfig: TypeOrmModuleOptions = {
  ...dbConnection,
  autoLoadEntities: true,
};
