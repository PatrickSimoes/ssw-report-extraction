import { Module } from '@nestjs/common';
import { ReportSswService } from './report-ssw.service';

@Module({
  providers: [ReportSswService]
})
export class ReportSswModule {}
