import { Injectable, OnModuleInit } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import { join } from 'path';

/**
 * Aguarda até que apareça algum arquivo "completo" na pasta de downloads
 * (ignora arquivos que terminam com .crdownload).
 * Retorna o nome do primeiro arquivo encontrado, ou lança erro se passar do timeout.
 */
async function waitForDownload(downloadPath: string, timeoutMs = 60000): Promise<string> {
    const start = Date.now();

    return new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
            const files = fs.readdirSync(downloadPath);
            // A lógica: se encontrar um arquivo sem a extensão .crdownload, significa que completou
            const downloadedFile = files.find(file => !file.endsWith('.crdownload'));

            if (downloadedFile) {
                clearInterval(intervalId);
                resolve(downloadedFile);
            }

            if (Date.now() - start > timeoutMs) {
                clearInterval(intervalId);
                reject(new Error(`Tempo limite de ${timeoutMs}ms esgotado aguardando download terminar.`));
            }
        }, 1000);
    });
}

@Injectable()
export class PuppeteerService implements OnModuleInit {
    // Ajuste conforme suas credenciais e URL
    private readonly ssw_dominio = 'THX';
    private readonly ssw_cpf = process.env.SSW_CPF;
    private readonly ssw_user = process.env.SSW_USER;
    private readonly ssw_password = process.env.SSW_PASSWORD;
    private readonly ssw_URL = 'https://sistema.ssw.inf.br/bin/ssw0422';

    async onModuleInit() {
        await this.exemploNavegacao('477');
    }

    async exemploNavegacao(numberRelatorio: string) {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Calcula range de datas
        const dateRange = this.getDateRange();

        // Cria (se não existir) a pasta de downloads
        const downloadPath = join(process.cwd(), 'downloads');
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath);
        }

        // Lança o browser. Se não baixar em modo visual, teste headless: true ou headless: 'new'
        const browser = await puppeteer.launch({ headless: false });

        // Abre a página inicial
        const [page] = await browser.pages();

        // Cria sessão CDP para setar o download path
        const cdpSession = await page.target().createCDPSession();
        await cdpSession.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
        });

        // Vai até a URL
        await page.goto(this.ssw_URL, { waitUntil: 'networkidle0' });

        // Login
        await page.type('[name="f1"]', this.ssw_dominio);
        await page.type('[name="f2"]', this.ssw_cpf);
        await page.type('[name="f3"]', this.ssw_user);
        await page.type('[name="f4"]', this.ssw_password);
        await page.click('#\\35');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // Digita o número do relatório e pressiona Enter
        await page.focus('#\\33');
        await page.keyboard.type(numberRelatorio);

        // Captura a popup
        const [popupPage] = await Promise.all([
            new Promise<puppeteer.Page>((resolve) => {
                browser.once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    resolve(newPage);
                });
            }),
            page.keyboard.press('Enter'),
        ]);

        await popupPage.bringToFront();
        await popupPage.waitForNavigation({ waitUntil: 'networkidle0' });

        // Preenche as datas
        await popupPage.type('[name="data_ini_pagamento_parcela"]', dateRange.startDate);
        await popupPage.type('[name="data_fin_pagamento_parcela"]', dateRange.endDate);

        // Situação das despesas
        await popupPage.click('#sit_desp');
        await popupPage.keyboard.down('Control');
        await popupPage.keyboard.press('A');
        await popupPage.keyboard.up('Control');
        await popupPage.keyboard.press('Backspace');
        await popupPage.type('#sit_desp', 'T');

        // Gera Excel
        await popupPage.click('#link_excel');

        let dateReportSolicitation: Date;

        // Localiza o frame ssw009 e clica em "[id='-1']"
        const ssw009Frame = popupPage.frames().find(f => f.url().includes('ssw009'));
        if (ssw009Frame) {
            await ssw009Frame.waitForSelector('[id="-1"]');
            await ssw009Frame.click('[id="-1"]');

            dateReportSolicitation = new Date();
        }

        // Aguarda a tela de fila de processamento
        const [processingQueue] = await Promise.all([
            new Promise<puppeteer.Page>((resolve) => {
                browser.once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    resolve(newPage);
                });
            }),
        ]);

        await processingQueue.bringToFront();
        await processingQueue.waitForNavigation({ waitUntil: 'networkidle0' });
        await processingQueue.waitForSelector('tbody', { visible: true });

        // Localiza a linha do relatório
        let report: string[] | null = null;
        let reportSeq: string | null = null;

        const rows = await processingQueue.$$('tbody tr');
        for (const row of rows) {
            const tds = await row.$$('td');
            if (tds.length < 9) continue;

            const texts = await Promise.all(tds.map(td => td.evaluate(el => el.textContent.trim())));
            if (
                texts[1]?.includes(numberRelatorio) &&
                texts[6] === 'Aguardando' &&
                texts[8]?.includes('Excluir')
            ) {
                report = texts;
                reportSeq = texts[0];
                break;
            }
        }

        if (!report) {
            console.warn('Não foi encontrado nenhum relatório com os critérios desejados.');
            await browser.close();
            return;
        }

        for (let i = 0; i < 7; i++) {
            try {
                await processingQueue.click('#\\32'); // Botão "Atualizar"
                console.log(`Clique de atualização nº ${i + 1}`);
            } catch (err) {
                console.error('Erro ao clicar em Atualizar (#2):', err);
            }

            // Aguarda alguns segundos
            await delay(5000);

            // Rebusca as linhas
            const newRows = await processingQueue.$$('tbody tr');
            let foundRow = null;
            let foundRowTexts: string[] = [];

            for (const row of newRows) {
                const tds = await row.$$('td');
                if (tds.length < 9) continue;

                const cell0Text = await tds[0].evaluate(el => el.textContent.trim());
                if (cell0Text === reportSeq) {
                    foundRow = row;
                    foundRowTexts = await Promise.all(tds.map(td => td.evaluate(el => el.textContent.trim())));
                    break;
                }
            }

            if (!foundRow) {
                console.log(`Não achei mais a row seq=${reportSeq}. Talvez tenha sido removida...`);
                await delay(10000);
                continue;
            }

            // Se estiver concluído e tiver "Baixar"
            if (foundRowTexts[6] === 'Concluído' && foundRowTexts[8]?.includes('Baixar')) {
                console.log('Relatório pronto para baixar!');

                // Espera 2s antes de clicar
                await delay(2000);

                const tds = await foundRow.$$('td');
                const lastTdLink = await tds[8].$('a.sra');
                if (lastTdLink) {
                    await lastTdLink.click();
                    console.log('Cliquei em Baixar, aguardando arquivo...');

                    // Aqui usamos a função que aguarda um arquivo "completo" (sem .crdownload) na pasta
                    try {
                        const downloadedFileName = await waitForDownload(downloadPath, 60000);
                        console.log('Arquivo baixado com sucesso:', downloadedFileName);
                    } catch (err) {
                        console.error('Erro ou timeout aguardando o arquivo terminar de baixar:', err);
                    }
                }
                break;
            } else {
                console.log(`Status atual: "${foundRowTexts[6]}" ou sem "Baixar". Aguarda +10s...`);
                await delay(10000);
            }
        }

        // Lista o que sobrou na pasta downloads
        const finalFiles = fs.readdirSync(downloadPath);
        console.log('Arquivos finais na pasta "downloads":', finalFiles);

        // Fecha o browser
        console.log('Encerrando browser...');
        await browser.close();
    }

    /**
     * Retorna o range de datas no formato DDMMYY
     */
    private getDateRange(referenceDate?: string): { baseDate: string, startDate: string, endDate: string } {
        const baseDate = referenceDate ? new Date(referenceDate) : new Date();

        const startDate = new Date(baseDate);
        startDate.setMonth(startDate.getMonth() - 5);

        const endDate = new Date(baseDate);
        endDate.setMonth(endDate.getMonth() + 7);

        const formatDateForSystem = (date: Date) => {
            const brFormat = date.toLocaleDateString('pt-BR');
            const parts = brFormat.split('/');
            return `${parts[0]}${parts[1]}${parts[2].slice(-2)}`;
        };

        return {
            baseDate: formatDateForSystem(baseDate),
            startDate: formatDateForSystem(startDate),
            endDate: formatDateForSystem(endDate),
        };
    }
}
