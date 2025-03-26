import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly downloadsFolder = './downloads';

  /**
   * Retorna o caminho do primeiro arquivo encontrado na pasta de downloads.
   * Como sempre haverá apenas 1 arquivo, esse é o caminho retornado.
   */
  async getFirstFilePath(): Promise<string> {
    const files = await fs.readdir(this.downloadsFolder);
    if (!files.length) {
      throw new Error('Nenhum arquivo encontrado na pasta de downloads.');
    }
    const filePath = join(this.downloadsFolder, files[0]);
    this.logger.log(`Arquivo encontrado: ${filePath}`);
    return filePath;
  }

  /**
   * Lê o arquivo CSV como uma string.
   * Ajuste a codificação se necessário (ex.: 'latin1' para arquivos em ISO-8859-1).
   */
  async readCsvFileAsString(): Promise<string> {
    const filePath = await this.getFirstFilePath();
    this.logger.log(`Lendo arquivo: ${filePath}`);
    // Utilize a codificação que corresponda ao seu arquivo, aqui é 'utf8'
    const content = await fs.readFile(filePath, { encoding: 'utf8' });
    return content;
  }
}
