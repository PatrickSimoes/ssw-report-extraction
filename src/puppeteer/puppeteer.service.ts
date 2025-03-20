import { Injectable, OnModuleInit } from '@nestjs/common';
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

    formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
