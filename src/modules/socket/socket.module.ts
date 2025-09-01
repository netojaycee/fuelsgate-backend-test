import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SocketService } from './socket.service';

@Module({
    imports: [ConfigModule],
    providers: [
        SocketService,
        {
            provide: 'SOCKET_SERVER',
            useFactory: (socketService: SocketService) => socketService.getServer(),
            inject: [SocketService],
        },
    ],
    exports: [SocketService, 'SOCKET_SERVER'],
})
export class SocketModule { }