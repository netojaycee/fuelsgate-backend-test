import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessageDto } from '../dto/message.dto';
import { MessageService } from '../services/message.service';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { forwardRef, Inject } from '@nestjs/common';
import { OfferDto } from '../dto/offer.dto';
import { OfferService } from '../services/offer.service';

@WebSocketGateway({ cors: true })
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(
    @Inject(forwardRef(() => MessageService))
    private messageService: MessageService,
    @Inject(forwardRef(() => OfferService))
    private offerService: OfferService
  ) { }

  handleConnection(client: Socket) {
    console.log('New client connected');
    client.broadcast.emit('New client connected');
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
    client.broadcast.emit('Client disconnected');
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: MessageDto, user: IJwtPayload) {
    await this.messageService.sendMessage(payload, user);
    client.broadcast.emit('receiveMessage', payload);
  }

  broadcastMessage(payload: MessageDto, user: IJwtPayload) {
    this.server.emit('receiveMessage', payload, user);
  }

  @SubscribeMessage('sendOffer')
  async handleOffer(client: Socket, payload: OfferDto, user: IJwtPayload) {
    await this.offerService.saveNewOfferData(payload, user);
    client.broadcast.emit('receiveOffer', payload);
  }

  broadcastOffer(payload: OfferDto, user: IJwtPayload) {
    this.server.emit('receiveOffer', payload, user);
  }
}