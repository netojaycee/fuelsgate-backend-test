

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Resend from 'resend';
import * as ejs from 'ejs';
// import { join } from 'path';

@Injectable()
export class ResendService {
    private readonly resend: Resend.Resend;

    constructor(private configService: ConfigService) {
        this.resend = new Resend.Resend(this.configService.get<string>('RESEND_API_KEY'));
    }

    async sendMail({
        to,
        subject,
        template,
        html,
        context,
    }: {
        to: string;
        subject: string;
        template?: string;
        html?: string;
        context?: object;
    }) {
        try {
            let emailHtml: string;

            if (template) {
                // Render EJS template to HTML
                // const templatePath = join(__dirname, '../mails', template);
                emailHtml = await ejs.renderFile(template, context || {});
            } else if (html) {
                // Use raw HTML
                emailHtml = html;
            } else {
                throw new Error('Either template or html must be provided');
            }

            // Send email via Resend
            const data = await this.resend.emails.send({
                from: 'FuelsGate <noreply@fuelsgate.com>',
                to: [to],
                subject,
                html: emailHtml,
            });

            console.log('Email sent:', data);
            return { message: 'Email sent successfully', data };
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
    }
}