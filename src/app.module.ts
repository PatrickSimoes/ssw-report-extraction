import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PuppeteerModule } from './puppeteer/puppeteer.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PuppeteerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
