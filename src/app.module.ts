import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookModule } from './book/book.module';
import { dbConfig } from 'lib/db-config';
@Module({
  imports: [
    TypeOrmModule.forRoot(dbConfig),
    BookModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { };
