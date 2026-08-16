import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookModule } from './book/book.module';
import { dbConfig } from 'lib/db-config';
import { ClientModule } from './client/client.module';
import { ProfileModule } from './profile/profile.module';
import { PostModule } from './post/post.module';
import { TagModule } from './tag/tag.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dbConfig),
    BookModule,
    ClientModule,
    ProfileModule,
    PostModule,
    TagModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule { };
