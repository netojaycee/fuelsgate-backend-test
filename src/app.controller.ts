import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';
import * as path from 'path';
import { getHtmlWithFooter } from 'src/utils/helpers';
import { Public } from './shared/decorators/public.route.decorator';
import { ResendService } from 'src/modules/resend/resend.service';


@Public()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly resendService: ResendService,
  ) { }

  

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }



  @Get('send-test-email')
  async sendTestEmail() {
    const recipients = ['netojaycee@gmail.com'];
    // const recipients = ['victorohakim@gmail.com', 'vohakim@fuelsgate.com'];

    const results: Array<{ recipient: string; email: string; status: string; error?: string }> = [];

    // ---- helpers --------------------------------------------------------------
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
    const BASE_DELAY_MS = 700;            // ~1.4 req/sec (safe under 2 rps)
    const MAX_RETRIES = 3;                // retry on 429
    const BACKOFF = (attempt: number) => Math.min(2000 * attempt, 8000); // 2s,4s,6s caps at 8s

    // cache templates so we don't re-read the same file repeatedly
    const templateCache = new Map<string, string>();
    const loadTemplate = (file: string) => {
      if (!templateCache.has(file)) {
        const html = fs.readFileSync(path.join(__dirname, file), 'utf8');
        templateCache.set(file, html);
      }
      return templateCache.get(file)!;
    };

    // ---- config ---------------------------------------------------------------
    const demoLinks = {
      trader: `<a href="https://fuelsgate.com/demo/trader" style="color:#b1976b; font-style:italic; text-decoration:underline;" target="_blank">Watch the Trader Demo</a>`,
      transporter: `<a href="https://fuelsgate.com/demo/transporter" style="color:#b1976b; font-style:italic; text-decoration:underline;" target="_blank">Watch the Transporter Demo</a>`,
    };

    const emails = [
      {
        name: 'General Info',
        file: './templates/general-info.html',
        subject: 'Your Fuelsgate Smart Contract (Ticket Order)',
        replace: { '{{role}}': 'trader', '{{demoLinks}}': demoLinks.trader, '{{user_name}}': 'Jaycee' },
      },
      {
        name: 'General Info',
        file: './templates/general-info.html',
        subject: 'Your Fuelsgate Smart Contract (Ticket Order)',
        replace: { '{{role}}': 'transporter', '{{demoLinks}}': demoLinks.transporter, '{{user_name}}': 'Jaycee' },
      },
      {
        name: 'Buyer Welcome',
        file: './templates/buyer-welcome.html',
        subject: `Get Ready to Supercharge Your Productivity with Fuelsgate!`,
        replace: { '{{user_name}}': 'Jaycee' },
      },
      {
        name: 'Transporter Welcome',
        file: './templates/transporter-welcome.html',
        subject: 'Welcome to Fuelsgate',
        replace: { '{{user_name}}': 'Jaycee' },
      },
      {
        name: 'Transporter Active',
        file: './templates/transporter-active.html',
        subject: 'Your Fuelsgate Account is Active',
        replace: { '{{user_name}}': 'Jaycee' },
      },
      {
        name: 'Supplier Sunset',
        file: './templates/supplier-sunset.html',
        subject: 'Fuelsgate Supplier Role Sunset',
        replace: { '{{user_name}}': 'Jaycee' },
      },
    ];

    // ---- send, throttled ------------------------------------------------------
    for (const recipient of recipients) {
      for (const email of emails) {
        // build HTML (from cache) and apply replacements
        let html = loadTemplate(email.file);
        for (const [key, value] of Object.entries(email.replace)) {
          html = html.replace(new RegExp(key, 'g'), value as string);
        }
        html = getHtmlWithFooter(html);

        let attempt = 0;
        while (attempt <= MAX_RETRIES) {
          try {
            const resp = await this.resendService.sendMail({
              to: recipient,
              subject: email.subject,
              html,
            });
            console.log(resp, "response")
            // If the response structure does not include an error property, assume success.
            results.push({ recipient, email: email.name, status: 'sent' });
            break; // success, exit retry loop
          } catch (err: any) {
            // SDKs often throw on HTTP errors
            if (err?.statusCode === 429 && attempt < MAX_RETRIES) {
              attempt++;
              const wait = BACKOFF(attempt);
              await sleep(wait);
              continue;
            }
            results.push({
              recipient,
              email: email.name,
              status: 'failed',
              error: err?.message || 'unknown error',
            });
            break; // non-retriable or maxed out
          } finally {
            // global throttle to stay < 2 rps
            await sleep(BASE_DELAY_MS);
          }
        }
      }
    }

    return { message: 'Demo emails sent', results };
  }

  // async sendTestEmail() {
  //   // const recipients = ['victorohakim@gmail.com', 'vohakim@fuelsgate.com'];
  //   const recipients = ['netojaycee@gmail.com'];
  //   const results = [];
  //   // Email templates config
  //   const demoLinks = {
  //     trader: `<a href="https://fuelsgate.com/demo/trader" style="color:#b1976b; font-style:italic; text-decoration:underline;" target="_blank">Watch the Trader Demo</a>`,
  //     transporter: `<a href="https://fuelsgate.com/demo/transporter" style="color:#b1976b; font-style:italic; text-decoration:underline;" target="_blank">Watch the Transporter Demo</a>`,
  //     // general: `<a href="https://fuelsgate.com/demo/general" style="color:#b1976b; font-style:italic; text-decoration:underline;" target="_blank">Watch the General Demo</a>`
  //   };
  //   const emails = [
  //     {
  //       name: 'General Info',
  //       file: './templates/general-info.html',
  //       subject: 'Your Fuelsgate Smart Contract (Ticket Order)',
  //       replace: {
  //         // '{{demo_video_url}}': 'https://fuelsgate.com/demo',
  //         // '{{ticket_order_image_url}}': 'https://fuelsgate.com/images/ticket-order-demo.png',
  //         '{{role}}': 'trader',
  //         '{{demoLinks}}': demoLinks.trader,
  //         '{{user_name}}': 'Jaycee',

  //       },
  //     },
  //     {
  //       name: 'General Info',
  //       file: './templates/general-info.html',
  //       subject: 'Your Fuelsgate Smart Contract (Ticket Order)',
  //       replace: {
  //         // '{{demo_video_url}}': 'https://fuelsgate.com/demo',
  //         // '{{ticket_order_image_url}}': 'https://fuelsgate.com/images/ticket-order-demo.png',
  //         '{{role}}': 'transporter',
  //         '{{demoLinks}}': demoLinks.transporter,
  //         '{{user_name}}': 'Jaycee',


  //       },
  //     },
  //     {
  //       name: 'Buyer Welcome',
  //       file: './templates/buyer-welcome.html',
  //       subject: `Get Ready to Supercharge Your Productivity with Fuelsgate!`,
  //       replace: {
  //         '{{user_name}}': 'Jaycee',
  //         // '{{demo_video_url}}': 'https://fuelsgate.com/demo',
  //         // '{{main_image_url}}': 'https://fuelsgate.com/images/trader-demo.png',
  //       },
  //     },
  //     {
  //       name: 'Transporter Welcome',
  //       file: './templates/transporter-welcome.html',
  //       subject: 'Welcome to Fuelsgate',
  //       replace: {
  //         '{{user_name}}': 'Jaycee',
  //         // '{{kyc_form_url}}': 'https://fuelsgate.com/kyc-form',
  //         // '{{terms_url}}': 'https://fuelsgate.com/terms',
  //         // '{{main_image_url}}': 'https://fuelsgate.com/images/transporter-welcome.png',
  //       },
  //     },
  //     {
  //       name: 'Transporter Active',
  //       file: './templates/transporter-active.html',
  //       subject: 'Your Fuelsgate Account is Active',
  //       replace: {
  //         '{{user_name}}': 'Jaycee',
  //         // '{{main_image_url}}': 'https://fuelsgate.com/images/truck-availability.png',
  //         // '{{dashboard_url}}': 'https://fuelsgate.com/dashboard',
  //       },
  //     },
  //     {
  //       name: 'Supplier Sunset',
  //       file: './templates/supplier-sunset.html',
  //       subject: 'Fuelsgate Supplier Role Sunset',
  //       replace: {
  //         '{{user_name}}': 'Jaycee',
  //       },
  //     },
  //   ];

  //   for (const recipient of recipients) {
  //     for (const email of emails) {
  //       try {
  //         let html = fs.readFileSync(path.join(__dirname, email.file), 'utf8');
  //         for (const [key, value] of Object.entries(email.replace)) {
  //           html = html.replace(new RegExp(key, 'g'), value);
  //         }
  //         html = getHtmlWithFooter(html);
  //         await this.resendService.sendMail({
  //           to: recipient,
  //           subject: email.subject,
  //           html,
  //         });
  //         results.push({ recipient, email: email.name, status: 'sent' });
  //       } catch (err) {
  //         results.push({ recipient, email: email.name, status: 'failed', error: err.message });
  //       }
  //     }
  //   }
  //   return { message: 'Demo emails sent', results };
  // }
}
