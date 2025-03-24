import { Controller, Get, Res } from '@nestjs/common';
import { CsvService } from './csv.service';
import { Response } from 'express';

@Controller('csv')
export class CsvController {
  constructor(private readonly csvService: CsvService) { }

  @Get('file')
  async getCsv(@Res() res: Response) {
    try {
      const csv = await this.csvService.getCsvContent();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="arquivo.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
