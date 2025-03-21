import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PuppeteerService implements OnModuleInit {
    ssw_dominio = 'THX';
    ssw_cpf = process.env.SSW_CPF;
    ssw_user = process.env.SSW_USER;
    ssw_password = process.env.SSW_PASSWORD;
    ssw_URL = 'https://sistema.ssw.inf.br/bin/ssw0422'

    onModuleInit() {
        this.exemploNavegacao('477');
    }

    async exemploNavegacao(numberRelatorio: string) {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        const dateRange = this.getDateRange();

        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto(this.ssw_URL, { waitUntil: 'networkidle0' });

        await page.type('[name="f1"]', this.ssw_dominio);
        await page.type('[name="f2"]', this.ssw_cpf);
        await page.type('[name="f3"]', this.ssw_user);
        await page.type('[name="f4"]', this.ssw_password);
        await page.click('#\\35');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        await page.focus('#\\33');
        await page.keyboard.type(numberRelatorio);

        const [popupPage] = await Promise.all([
            new Promise<puppeteer.Page>((resolve) => {
                // O "targetcreated" dispara sempre que abre uma nova aba/janela
                browser.once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    console.log(newPage)
                    resolve(newPage);
                });
            }),
            page.keyboard.press('Enter'),
        ]);

        await popupPage.bringToFront();
        await popupPage.waitForNavigation({ waitUntil: 'networkidle0' });

        await popupPage.type('[name="data_ini_pagamento_parcela"]', dateRange.startDate);
        await popupPage.type('[name="data_fin_pagamento_parcela"]', dateRange.endDate);

        await popupPage.click('#sit_desp');
        await popupPage.keyboard.down('Control');
        await popupPage.keyboard.press('A');
        await popupPage.keyboard.up('Control');
        await popupPage.keyboard.press('Backspace');
        await popupPage.type('#sit_desp', 'T'); // 'T' - Todas menos canceladas

        await popupPage.click('#link_excel');

        let dateReportSolicitation: Date;

        const ssw009Frame = popupPage.frames().find(f => f.url().includes('ssw009'));

        if (ssw009Frame) {
            await ssw009Frame.waitForSelector('[id="-1"]');
            await ssw009Frame.click('[id="-1"]');

            dateReportSolicitation = new Date();
        }

        const [processingQueue] = await Promise.all([
            new Promise<puppeteer.Page>((resolve) => {
                browser.once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    console.log('Popup Fila Processamento Target criado:', newPage.url());
                    resolve(newPage);
                });
            }),
        ]);

        await processingQueue.bringToFront();
        await processingQueue.waitForNavigation({ waitUntil: 'networkidle0' });

        await processingQueue.waitForSelector('tbody', { visible: true });

        let report: string[] | null = null;
        let reportSeq: string | null = null;

        const rows = await processingQueue.$$('tbody tr');
        for (const row of rows) {
            const tds = await row.$$('td');
            if (tds.length < 9) continue;

            const texts = await Promise.all(
                tds.map(td => td.evaluate(el => el.textContent.trim()))
            );

            if (
                texts[1]?.includes(numberRelatorio) &&
                texts[6] === 'Aguardando' &&
                texts[8]?.includes('Excluir')
            ) {
                report = texts;
                reportSeq = texts[0];
                console.log('Relatório aguardando encontrado:', report);
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
                await processingQueue.click('#\\32');
                console.log(`Clique de atualização nº ${i + 1}`);
            } catch (err) {
                console.error('Erro ao clicar no botão atualizar #2:', err);
            }

            const newRows = await processingQueue.$$('tbody tr');
            let foundRow = null;
            let foundRowTexts: string[] = [];

            for (const row of newRows) {
                // const seqAttr = await row.evaluate(r => r.getAttribute('seq'));
                // if (seqAttr === reportSeq) { foundRow = row; break; }

                const tds = await row.$$('td');
                if (tds.length < 9) continue;
                const cell0Text = await tds[0].evaluate(el => el.textContent.trim());
                if (cell0Text === reportSeq) {
                    foundRow = row;
                    foundRowTexts = await Promise.all(
                        tds.map(td => td.evaluate(el => el.textContent.trim()))
                    );
                    break;
                }
            }

            if (!foundRow) {
                console.log(`Não achei mais a row com seq=${reportSeq}. Talvez tenha sido removida...`);
                await delay(10000);
                continue;
            }

            if (foundRowTexts[6] === 'Concluído' && foundRowTexts[8]?.includes('Baixar')) {
                console.log('Relatório pronto para baixar!');

                const tds = await foundRow.$$('td');
                const lastTdLink = await tds[8].$('a.sra');
                if (lastTdLink) {
                    await lastTdLink.click();
                    console.log('Cliquei em Baixar.');
                }

                break;
            } else {
                console.log('Ainda não está pronto. Esperando 10s e tentando de novo...');
                await delay(10000);
            }
        }

        console.log('Encerrando browser...');
        await browser.close();
    }

    private getDateRange(referenceDate?: string): { baseDate: string, startDate: string, endDate: string } {
        const baseDate = referenceDate ? new Date(referenceDate) : new Date();

        const startDate = new Date(baseDate);
        startDate.setMonth(startDate.getMonth() - 5);

        const endDate = new Date(baseDate);
        endDate.setMonth(endDate.getMonth() + 7);

        // Function to format date in the required system format (DDMMYY)
        const formatDateForSystem = (date: Date) => {
            let brFormat = date.toLocaleDateString('pt-BR');
            let parts = brFormat.split('/');
            return `${parts[0]}${parts[1]}${parts[2].slice(2)}`;
        };

        return {
            baseDate: formatDateForSystem(baseDate),
            startDate: formatDateForSystem(startDate),
            endDate: formatDateForSystem(endDate),
        };
    }
}
