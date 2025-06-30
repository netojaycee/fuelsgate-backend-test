import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { forwardRef, Inject } from '@nestjs/common';
import { TruckOrderService } from '../services/truck-order.service';
import { TruckOrderDto } from '../dto/truck-order.dto';

@WebSocketGateway({ cors: true })
export class TruckOrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(
    @Inject(forwardRef(() => TruckOrderService))
    private truckOrderService: TruckOrderService
  ) { }

  handleConnection(client: Socket) {
    console.log('New client connected');
    client.broadcast.emit('New client connected');
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
    client.broadcast.emit('Client disconnected');
  }

  @SubscribeMessage('sendTruckOrder')
  async handleOrder(client: Socket, payload: TruckOrderDto, user: IJwtPayload) {
    await this.truckOrderService.createNewOrder(payload, user);
    client.broadcast.emit('receiveTruckOrder', payload);
  }

  broadcastOrder(payload: TruckOrderDto, user: IJwtPayload) {
    this.server.emit('receiveTruckOrder', payload, user);
  }

  @SubscribeMessage('updateTruckOrderStatus')
  async handleOrderStatus(client: Socket, payload: TruckOrderDto, orderId: string) {
    await this.truckOrderService.updateStatusOrder(orderId, payload, 'order');
    client.broadcast.emit('updatedTruckOrderStatus', payload);
  }

  broadcastOrderStatus(payload: TruckOrderDto) {
    this.server.emit('updatedTruckOrderStatus', payload);
  }

  @SubscribeMessage('updateTruckOrderPrice')
  async handleOrderPrice(client: Socket, payload: TruckOrderDto, orderId: string) {
    await this.truckOrderService.updatePriceOrder(orderId, payload);
    client.broadcast.emit('updatedTruckOrderPrice', payload);
  }

  broadcastOrderPrice(payload: TruckOrderDto) {
    this.server.emit('updatedTruckOrderPrice', payload);
  }
}