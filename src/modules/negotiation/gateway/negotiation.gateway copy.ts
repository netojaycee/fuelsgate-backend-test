import {
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { NegotiationService } from '../services/negotiation.service';
import { SOCKET_EVENTS } from 'src/utils/SocketEvents';
import { SocketService } from 'src/modules/socket/socket.service';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { NegotiationDto } from '../dto/negotiation.dto';
import { Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { OrderService } from 'src/modules/order/services/order.service';
import { OrderRepository } from 'src/modules/order/repositories/order.repository';
import { MessageDto } from 'src/modules/message/dto/message.dto';
import { OrderDto } from 'src/modules/order/dto/order.dto';

export class NegotiationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private logger = new Logger('NegotiationGateway');
    private server: Server;

    constructor(
        @Inject(forwardRef(() => NegotiationService))
        private readonly negotiationService: NegotiationService,
        @Inject(forwardRef(() => OrderService))
        private readonly orderService: OrderService,
        private readonly jwtService: JwtService,
        private readonly orderRepository: OrderRepository,
        private readonly userRepository: UserRepository,
        private readonly socketService: SocketService,
    ) {
        this.server = this.socketService.getServer();
        this.server.on('connection', async (client: Socket) => {
            await this.handleConnection(client);
            client.on(SOCKET_EVENTS.JOIN_ROOM, (data) => this.handleJoinRoom(client, data));
            client.on(SOCKET_EVENTS.SEND_MESSAGE, (payload, user) => this.handleSendMessage(client, payload, user));
            client.on(SOCKET_EVENTS.MESSAGE_READ, (data, user) => this.handleMarkMessageRead(client, data, user));
            client.on(SOCKET_EVENTS.SEND_NEGOTIATION, (payload, user) => this.handleNegotiation(client, payload, user));
            client.on(SOCKET_EVENTS.SEND_ORDER, (payload, user) => this.handleOrder(client, payload, user));
            client.on(SOCKET_EVENTS.UPDATE_ORDER, (payload, orderId) => this.handleOrderStatus(client, payload, orderId));
            client.on(SOCKET_EVENTS.ACCEPT_NEGOTIATION, (data) => this.handleAcceptNegotiation(client, data));
            client.on(SOCKET_EVENTS.REJECT_NEGOTIATION, (data) => this.handleRejectNegotiation(client, data));
            client.on(SOCKET_EVENTS.CANCEL_NEGOTIATION, (data) => this.handleCancelNegotiation(client, data));
            client.on('disconnect', () => this.handleDisconnect(client));
        });
    }

    async handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
        const { token } = client.handshake.auth;
        let user: IJwtPayload;
        try {
            user = this.jwtService.verify(token);
        } catch (err) {
            this.logger.warn(`Unauthorized client connected: ${client.id}`);
            client.disconnect();
            return;
        }
        if (!user || !user.id) {
            this.logger.warn(`Unauthorized client connected: ${client.id}`);
            client.disconnect();
            return;
        }
        // Join the user's own room for direct notifications and badge updates
        client.join(user.id);
        this.logger.log(`Client ${user.id} joined their own room for notifications.`);
        client.emit('connection', { message: 'Connected own room' });
        // Fetch ongoing negotiations and join rooms
        const negotiations = await this.negotiationService.getAllNegotiations({
            profileId: user.id,
            status: 'ongoing',
        });
        for (const negotiation of negotiations) {
            client.join(negotiation._id.toString());
            this.logger.log(`Client ${user.id} joined room: ${negotiation._id}`);
        }
        client.emit('connection', { message: 'Connected to negotiation namespace' });
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    private getRoomId(userId: string, partnerId: string | Types.ObjectId): string {
        return [userId, partnerId].sort().join(':');
    }

    @SubscribeMessage(SOCKET_EVENTS.JOIN_ROOM)
    handleJoinRoom(client: Socket, { negotiationId }: { negotiationId: string }) {
        client.join(negotiationId);
        this.logger.log(`Client ${client.id} joined room: ${negotiationId}`);
        client.emit('joinedRoom', { roomId: negotiationId });
    }

    @SubscribeMessage(SOCKET_EVENTS.SEND_MESSAGE)
    async handleSendMessage(client: Socket, payload: MessageDto, user: IJwtPayload) {
        const message = await this.negotiationService.sendMessage(payload, user);
        const roomId = this.getRoomId(user.id, payload.receiverId);
        this.server.to(roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, { ...message, status: 'delivered' });
        await this.negotiationService.updateMessageStatus(message._id, 'delivered');
        this.server.to(roomId).emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'new_message',
            negotiationId: payload.negotiationId,
            count: await this.negotiationService.getUnreadMessagesCount(payload.negotiationId, payload.receiverId),
        });
    }

    @SubscribeMessage(SOCKET_EVENTS.MESSAGE_READ)
    async handleMarkMessageRead(client: Socket, { messageId }: { messageId: string }, user: IJwtPayload) {
        await this.negotiationService.updateMessageStatus(messageId, 'read');
        const message = await this.negotiationService.getMessage(messageId);
        const roomId = this.getRoomId(
            user.id,
            message.negotiationId.senderId === user.id ? message.negotiationId.receiverId : message.negotiationId.senderId,
        );
        this.server.to(roomId).emit('messageStatusUpdated', { messageId, status: 'read' });
        this.server.to(roomId).emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'read_message',
            negotiationId: message.negotiationId,
            count: await this.negotiationService.getUnreadMessagesCount(message.negotiationId, user.id),
        });
    }

    @SubscribeMessage(SOCKET_EVENTS.SEND_NEGOTIATION)
    async handleNegotiation(client: Socket, payload: NegotiationDto, user: IJwtPayload) {
        const negotiation = await this.negotiationService.createNegotiation(payload, user);
        const roomId = this.getRoomId(user.id, payload.receiverId);
        this.server.to(roomId).emit(SOCKET_EVENTS.RECEIVE_NEGOTIATION, negotiation);
        this.server.to(roomId).emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'new_negotiation',
            negotiationId: negotiation._id,
            count: await this.negotiationService.getUnreadMessagesCount(negotiation._id, payload.receiverId),
        });
    }

    @SubscribeMessage(SOCKET_EVENTS.SEND_ORDER)
    async handleOrder(client: Socket, payload: OrderDto, user: IJwtPayload) {
        const order = await this.orderService.createOrder(payload, user);
        const roomId = this.getRoomId(user.id, payload.profileId);
        this.server.to(roomId).emit(SOCKET_EVENTS.RECEIVE_ORDER, order);
        this.server.to(roomId).emit(SOCKET_EVENTS.NOTIFICATION, { type: 'new_order', orderId: order._id });
    }

    @SubscribeMessage(SOCKET_EVENTS.UPDATE_ORDER)
    async handleOrderStatus(client: Socket, payload: OrderDto, orderId: string) {
        const order = await this.orderService.updateStatusOrder(orderId, payload);
        const roomId = this.getRoomId(payload.buyerId, payload.profileId);
        this.server.to(roomId).emit('updatedOrderStatus', order);
        this.server.to(roomId).emit(SOCKET_EVENTS.NOTIFICATION, { type: 'order_status_updated', orderId });
    }

    @SubscribeMessage(SOCKET_EVENTS.ACCEPT_NEGOTIATION)
    async handleAcceptNegotiation(
        client: Socket,
        { negotiationId, orderId, user }: { negotiationId: string; orderId: string; user: any },
    ) {
        console.log('Accepting negotiation:', negotiationId, 'for order:', orderId, 'by user:', user);
        const negotiation = await this.negotiationService.acceptNegotiation(negotiationId, user);
        const lastMessage = await this.negotiationService.fetchLastMessage(negotiationId);
        const offerPrice = lastMessage?.offerPrice;
        const order = await this.orderService.acceptNegotiationOrder(orderId, user, offerPrice);
        const userDetails = await this.userRepository.findOne(user._id);
        const systemMessage = await this.negotiationService.createSystemMessage({
            negotiationId,
            content: `${userDetails.firstName} accepted the negotiation`,
            orderId,
            messageType: 'system',
        });
        this.server.to(negotiationId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
            ...systemMessage,
            status: 'delivered',
        });
        this.server.to(negotiationId).emit(SOCKET_EVENTS.RECEIVE_NEGOTIATION, {
            ...negotiation.toObject(),
            status: 'completed',
        });
        this.server.to(negotiationId).emit(SOCKET_EVENTS.UPDATE_ORDER, {
            ...order.toObject(),
            status: 'in-progress',
        });
        this.server.to(negotiationId).emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'negotiation_accepted',
            negotiationId,
            orderId,
            count: await this.negotiationService.getUnreadMessagesCount(negotiationId, user.id),
        });
        if (order.type === 'truck') {
            const otherOrders = await this.orderRepository.findOrders({
                truckId: order.truckId,
                _id: { $ne: orderId },
                status: { $ne: 'completed' },
            });
            for (const otherOrder of otherOrders) {
                const recipient = await this.userRepository.findOne(otherOrder.buyerId);
                if (recipient && recipient._id.toString() !== user.id) {
                    this.server.to(recipient._id.toString()).emit(SOCKET_EVENTS.NOTIFICATION, {
                        type: 'order_cancelled',
                        orderId: otherOrder._id,
                        count: 1,
                    });
                }
            }
        }
    }

    @SubscribeMessage(SOCKET_EVENTS.REJECT_NEGOTIATION)
    async handleRejectNegotiation(
        client: Socket,
        { negotiationId, offerPrice, user }: { negotiationId: string; offerPrice: number; user: IJwtPayload },
    ) {
        const message = await this.negotiationService.rejectNegotiation(negotiationId, offerPrice, user);
        const order = await this.orderRepository.findOrderById(message.orderId);
        this.server.to(negotiationId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
            ...message.toObject(),
            status: 'delivered',
            orderDetails: order,
        });
        this.server.to(message.receiverId.toString()).emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'new_message',
            negotiationId,
            count: await this.negotiationService.getUnreadMessagesCount(negotiationId, message.receiverId),
        });
        await this.negotiationService.updateMessageStatus(message._id, 'delivered');
    }

    @SubscribeMessage(SOCKET_EVENTS.CANCEL_NEGOTIATION)
    async handleCancelNegotiation(
        client: Socket,
        { negotiationId, orderId, user }: { negotiationId: string; orderId: string; user: any },
    ) {
        const negotiation = await this.negotiationService.cancelNegotiation(negotiationId, user);
        const order = await this.orderService.cancelOrder(orderId, user);
        const userDetails = await this.userRepository.findOne(user._id);
        const systemMessage = await this.negotiationService.createSystemMessage({
            negotiationId,
            content: `${userDetails.firstName} canceled the order`,
            orderId,
            messageType: 'system',
        });
        this.server.to(negotiationId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
            ...systemMessage,
            status: 'delivered',
        });
        this.server.to(negotiationId).emit(SOCKET_EVENTS.RECEIVE_NEGOTIATION, {
            ...negotiation.toObject(),
            status: 'cancelled',
        });
        this.server.to(negotiationId).emit(SOCKET_EVENTS.UPDATE_ORDER, {
            ...order.toObject(),
            status: 'cancelled',
        });
        this.server.to(negotiationId).emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'negotiation_cancelled',
            negotiationId,
            orderId,
            count: await this.negotiationService.getUnreadMessagesCount(negotiationId, user.id),
        });
    }
}
