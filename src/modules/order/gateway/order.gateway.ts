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
import { OrderDto } from '../dto/order.dto';
import { OrderService } from '../services/order.service';

@WebSocketGateway({ cors: true })
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  constructor(
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService
  ) { }

  handleConnection(client: Socket) {
    console.log('New client connected');
    client.broadcast.emit('New client connected');
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
    client.broadcast.emit('Client disconnected');
  }

  @SubscribeMessage('sendOrder')
  async handleOrder(client: Socket, payload: OrderDto, user: IJwtPayload) {
    await this.orderService.createNewOrder(payload, user);
    client.broadcast.emit('receiveOrder', payload);
  }

  broadcastOrder(payload: OrderDto, user: IJwtPayload) {
    this.server.emit('receiveOrder', payload, user);
  }

  @SubscribeMessage('updateOrderStatus')
  async handleOrderStatus(client: Socket, payload: OrderDto, orderId: string) {
    await this.orderService.updateStatusOrder(orderId, payload);
    client.broadcast.emit('updatedOrderStatus', payload);
  }

  broadcastOrderStatus(payload: OrderDto) {
    this.server.emit('updatedOrderStatus', payload);
  }

  @SubscribeMessage('updateOrderPrice')
  async handleOrderPrice(client: Socket, payload: OrderDto, orderId: string) {
    await this.orderService.updatePriceOrder(orderId, payload);
    client.broadcast.emit('updatedOrderPrice', payload);
  }

  broadcastOrderPrice(payload: OrderDto) {
    this.server.emit('updatedOrderPrice', payload);
  }
}