import { Module } from '@nestjs/common';
import { CsvService } from './csv.service';
import { CsvController } from './csv.controller';
import { ReportSswService } from 'src/report-ssw/report-ssw.service';

@Module({
  controllers: [CsvController],
  providers: [CsvService, ReportSswService],
})
export class CsvModule { }
