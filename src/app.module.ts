import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookModule } from './book/book.module';
import { dbConfig } from 'lib/db-config';
import { ClientModule } from './client/client.module';
import { ProfileModule } from './profile/profile.module';
import { PostModule } from './post/post.module';
@Module({
  imports: [
    TypeOrmModule.forRoot(dbConfig),
    BookModule,
    ClientModule,
    ProfileModule,
    PostModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { };
