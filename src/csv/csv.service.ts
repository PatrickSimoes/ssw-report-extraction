import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);
  private readonly downloadsFolder = './downloads';

  async getFirstFilePath(): Promise<string> {
    const files = await fs.readdir(this.downloadsFolder);

    if (files.length === 0) {
      throw new Error('Nenhum arquivo encontrado na pasta de downloads.');
    }

    const filePath = join(this.downloadsFolder, files[0]);
    this.logger.log(`Arquivo encontrado: ${filePath}`);
    return filePath;
  }

  // ✅ Novo método: retorna o conteúdo do CSV como string
  async getCsvContent(): Promise<string> {
    const filePath = await this.getFirstFilePath();
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }
}
