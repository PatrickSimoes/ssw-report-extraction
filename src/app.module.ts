import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { CsvModule } from './csv/csv.module';
import { ReportSswModule } from './report-ssw/report-ssw.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CsvModule,
    ReportSswModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
