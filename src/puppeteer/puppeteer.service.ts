import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PuppeteerService {
    ssw_dominio = 'THX';
    ssw_cpf = process.env.SSW_CPF;
    ssw_user = process.env.SSW_USER;
    ssw_password = process.env.SSW_PASSWORD;
    ssw_URL = 'https://sistema.ssw.inf.br/bin/ssw0422'

    constructor() {
        this.exemploNavegacao('477');
        // console.log(this.getDateRange());
    }

    async exemploNavegacao(numberRelatorio: string) {
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

        console.log('Login concluído.');

        await page.focus('#\\33');
        await page.keyboard.type(numberRelatorio);

        const [popupPage] = await Promise.all([
            new Promise<puppeteer.Page>((resolve) => {
                // O "targetcreated" dispara sempre que abre uma nova aba/janela
                browser.once('targetcreated', async (target) => {
                    const newPage = await target.page();
                    resolve(newPage);
                });
            }),
            // Dispara Enter que supostamente abre a nova janela
            page.keyboard.press('Enter'),
        ]);

        console.log('Nova janela (popup) detectada.');

        // 3) Podemos aguardar a navegação completa dentro do popup
        await popupPage.bringToFront();
        await popupPage.waitForNavigation({ waitUntil: 'networkidle0' });

        console.log('Popup carregado. Agora estamos na tela "477 - Consulta de Despesas".');
        // 4) Preencher campos nesse popup
        // IDs e names podem mudar, então ajuste:
        console.log(dateRange)
        await popupPage.type('[name="data_ini_pagamento_parcela"]', dateRange.startDate);
        await popupPage.type('[name="data_fin_pagamento_parcela"]', dateRange.endDate);

        await popupPage.click('#sit_desp');
        await popupPage.keyboard.down('Control');
        await popupPage.keyboard.press('A');
        await popupPage.keyboard.up('Control');
        await popupPage.keyboard.press('Backspace');
        await popupPage.type('#sit_desp', 'T'); // 'T' - Todas menos canceladas

        await popupPage.click('#link_excel');

        const frames = popupPage.frames();
        for (const f of frames) {
            console.log('Frame URL:', f.url());
        }

        const ssw1440Frame = popupPage.frames().find(f => f.url().includes('ssw009'));
        if (ssw1440Frame) {
            await ssw1440Frame.waitForSelector('[id="-1"]');
            await ssw1440Frame.click('[id="-1"]');
        }

        await browser.close();
    }

    getDateRange(referenceDate?: string): { baseDate: string, startDate: string, endDate: string } {
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
