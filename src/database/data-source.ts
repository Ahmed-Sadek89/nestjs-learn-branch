import 'reflect-metadata';
import { dbConnection } from 'lib/db-config';
import { Client } from 'src/client/entities/client.entity';
import { Profile } from 'src/profile/entities/profile.entity';
import { Post } from 'src/post/entities/post.entity';
import { Tag } from 'src/tag/entities/tag.entity';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

const options: DataSourceOptions & SeederOptions = {
  ...dbConnection,
  // Tag is required for Post#tags metadata (not seeded)
  entities: [Client, Profile, Post, Tag],
  factories: ['src/database/factories/**/*{.ts,.js}'],
  seeds: ['src/database/seeds/**/*{.ts,.js}'],
};

export const AppDataSource = new DataSource(options);
