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
        // this.exemploNavegacao();
    }

    async exemploNavegacao() {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        await page.goto(this.ssw_URL, { waitUntil: 'networkidle0' });

        await page.click('[name="f1"]', { clickCount: 3 });

        await page.keyboard.press('Backspace');

        await page.type('[name="f1"]', this.ssw_dominio);

        await page.click('[name="f2"]', { clickCount: 3 });

        await page.keyboard.press('Backspace');

        await page.type('[name="f2"]', this.ssw_password);

        await page.type('[name="f3"]', this.ssw_user);

        await page.type('[name="f4"]', this.ssw_password);

        await page.click('#5');

        await browser.close();
    }
}
