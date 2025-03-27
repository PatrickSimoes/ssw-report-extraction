import { Body, Controller, HttpException, HttpStatus, Logger, Post } from '@nestjs/common';
import { CsvService } from './csv.service';
import { ReportSswService } from 'src/report-ssw/report-ssw.service';

@Controller('csv')
export class CsvController {
  constructor(
    private readonly csvService: CsvService,
    private readonly reportSswService: ReportSswService,
  ) { }

  /**
   */
  @Post('data')
  async getCsvData(
    @Body() body: { cpf: string; user: string; password: string },
  ) {
    const { cpf, user, password } = body;
    try {
      Logger.log('Iniciado extração de dados do SSW');
      
      const result = await this.reportSswService.sswNavegacao(cpf, user, password);

      Logger.log('Disponibilizando CSV data')

      const csvContent = await this.csvService.readCsvFileAsString();

      Logger.log('Extração de dados do SSW finalizada')

      return { data: csvContent };
    } catch (error) {
      throw new HttpException(
        error.message || 'Erro ao ler o arquivo CSV',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
