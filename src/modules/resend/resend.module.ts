import { Module } from '@nestjs/common';
import { ResendService } from './resend.service';

@Module({
    providers: [ResendService],
    exports: [ResendService], // <-- Export so other modules can use it
})
export class ResendModule { }