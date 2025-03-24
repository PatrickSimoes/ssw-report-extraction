import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CsvModule } from './csv/csv.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CsvModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
