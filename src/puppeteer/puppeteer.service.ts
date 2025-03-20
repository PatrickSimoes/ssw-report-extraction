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

        await page.click('[name="f1"]', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('[name="f1"]', this.ssw_dominio);
        await page.click('[name="f2"]', { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type('[name="f2"]', this.ssw_cpf);
        await page.type('[name="f3"]', this.ssw_user);
        await page.type('[name="f4"]', this.ssw_password);

        await page.click('#\\35'); // ID "5", precisa do escape para funcionar no Puppeteer
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        console.log('Login realizado com sucesso!');

        await page.focus('#\\33'); // O ID "3" precisa de escape (\\33 é o código do número 3)
        await page.keyboard.press('Backspace');
        await page.type('#\\33', numberRelatorio);

        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // Preencher a data inicial de pagamento
        await page.click('[name="data_ini_pagamento_parcela"]'); // Garante que o campo está ativo
        await page.keyboard.down('Control');
        await page.keyboard.press('A'); // Seleciona todo o texto
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace'); // Apaga o valor atual
        await page.type('[name="data_ini_pagamento_parcela"]', dateRange.startDate);

        // Preencher a data final de pagamento
        await page.click('[name="data_fin_pagamento_parcela"]');
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.type('[name="data_fin_pagamento_parcela"]', dateRange.endDate);

        // Preencher o campo "sit_desp"
        await page.click('#sit_desp');
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await page.type('#sit_desp', 'T'); // 'T' - Todas menos canceladas

        // Disparar evento 'change' para garantir que a alteração seja processada
        await page.evaluate(() => {
            const element = document.querySelector('#sit_desp') as HTMLInputElement;
            element.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Clicar no botão de exportação para Excel
        await page.click('#link_excel');

        // Aguardar um tempo extra para garantir que o arquivo seja gerado
        await new Promise(resolve => setTimeout(resolve, 3000));


        // Fechar o navegador (remova esta linha se precisar continuar)
        // await browser.close();
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
