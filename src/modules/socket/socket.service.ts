import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SocketService {
    private readonly server: Server;
    private readonly logger = new Logger(SocketService.name);

    constructor(private configService: ConfigService) {
        this.server = new Server({
            cors: {
                // origin: this.configService.get<string>('CLIENT_URL') || 'http://localhost:3200',
                origin: '*', // Allow all origins for development; adjust as needed for production
                credentials: true,
            },
        });

        this.server.on('connection', (socket) => {
            this.logger.log(`Client connected: ${socket.id}`);
            socket.on('disconnect', () => {
                this.logger.log(`Client disconnected: ${socket.id}`);
            });
        });
    }

    getServer(): Server {
        return this.server;
    }
}