import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ReportSswModule } from './puppeteer/report-ssw.module';
import { ExtractionDataCsvModule } from './extraction-data-csv/extraction-data-csv.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ReportSswModule,
    ExtractionDataCsvModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
