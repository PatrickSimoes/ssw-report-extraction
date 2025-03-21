// import { Injectable } from '@nestjs/common';

// @Injectable()
// export class ExtractionDataCsvService {
//     constructor() {
//         console.log(this.parseCsvFile())
//     }

//     async parseCsvFile() {
//         // 1) Monta o caminho do arquivo (ajuste o nome se precisar)
//         const filePath = join(process.cwd(), 'downloads', 'CSVTHX01125595THX[1]115048.sswweb');

//         // 2) Lê o arquivo como texto
//         const fileContent = fs.readFileSync(filePath, 'utf8');

//         // 3) Usa o Papa Parse para transformar o conteúdo em array
//         const parsed = (fileContent, {
//             // Se o separador for ponto e vírgula, defina delimiter: ';'
//             // Se for vírgula, retire essa opção ou use delimiter: ','.
//             delimiter: ';',
//             skipEmptyLines: true // Ignora linhas em branco
//         });

//         // `parsed.data` contém o resultado como array de arrays
//         const matriz = parsed.data as string[][];

//         console.log(matriz);

//         // A partir daqui, você pode fazer o que precisar com a `matriz`.
//     }
// }
