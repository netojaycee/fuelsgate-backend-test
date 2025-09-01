import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketService } from 'src/modules/socket/socket.service';
import { NotificationGateway } from 'src/modules/notification/gateway/notification.gateway';
import { Types } from 'mongoose';
import { MessageDocument } from '../entities/message.entity';
import { NegotiationService } from 'src/modules/negotiation/services/negotiation.service';
import { MessageDto } from '../dto/message.dto';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { SOCKET_EVENTS } from 'src/utils/SocketEvents';

@Injectable()
export class MessageGateway {
    private logger = new Logger('MessageGateway');
    private server: Server;

    constructor(
        private readonly socketService: SocketService,
        private readonly notificationGateway: NotificationGateway,
        private readonly negotiationService: NegotiationService,
    ) {
        this.server = this.socketService.getServer();
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.server.on('connection', (client) => {
            this.logger.log(`Client connected to MessageGateway: ${client.id}`);

            // Listen for join room events
            client.on(SOCKET_EVENTS.JOIN_ROOM, (data) => {
                this.handleJoinRoomSocket(client, data);
            });

            // Listen for send message events
            client.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => {
                this.handleSendMessageSocket(client, data);
            });

            // Listen for message read events
            client.on(SOCKET_EVENTS.MESSAGE_READ, (data) => {
                this.handleMarkMessageReadSocket(client, data);
            });
        });
    }

    // Socket event handlers
    async handleJoinRoomSocket(client: any, data: { negotiationId: string }): Promise<void> {
        this.logger.log(`Client ${client.id} joining room ${data.negotiationId}`);
        client.join(data.negotiationId);
        client.emit(SOCKET_EVENTS.JOINED_ROOM, { negotiationId: data.negotiationId });
    }

    async handleSendMessageSocket(client: any, data: {
        senderId: string;
        receiverId: string;
        negotiationId: string;
        content: string;
        user: any;
    }): Promise<void> {
        this.logger.log(`Socket: Send message in negotiation ${data.negotiationId}`);

        try {
            const messageDto: MessageDto = {
                content: data.content,
                negotiationId: data.negotiationId,
                receiverId: data.receiverId,
                messageType: 'user',
            };

            await this.handleSendMessage(
                data.senderId,
                data.receiverId,
                data.negotiationId,
                messageDto,
                data.user
            );
        } catch (error) {
            this.logger.error('Error sending message via socket:', error);
            client.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to send message' });
        }
    }

    async handleMarkMessageReadSocket(client: any, data: {
        messageId: string;
        userId: string;
    }): Promise<void> {
        this.logger.log(`Socket: Mark message ${data.messageId} as read by user ${data.userId}`);

        try {
            await this.handleMarkMessageRead(data.messageId, data.userId);
        } catch (error) {
            this.logger.error('Error marking message as read via socket:', error);
            client.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to mark message as read' });
        }
    }

    // Core business logic methods (existing methods)
    async handleSendMessage(
        senderId: string | Types.ObjectId,
        receiverId: string | Types.ObjectId,
        negotiationId: string | Types.ObjectId,
        messageDto: MessageDto,
        user: IJwtPayload
    ): Promise<MessageDocument> {
        const receiverObjectId = typeof receiverId === 'string' ? new Types.ObjectId(receiverId) : receiverId;
        const negotiationObjectId = typeof negotiationId === 'string' ? new Types.ObjectId(negotiationId) : negotiationId;

        // Create message with 'sent' status
        const message = await this.negotiationService.sendMessage({
            ...messageDto,
            negotiationId: negotiationObjectId,
            receiverId: receiverObjectId
        }, user);

        // Emit message to negotiation room
        this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.MESSAGE_SENT, {
            ...message.toObject(),
            status: 'sent'
        });

        // Update status to delivered immediately (simulating real-time delivery)
        await this.updateMessageStatus(message._id, 'delivered');

        // Emit delivered status
        this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, {
            messageId: message._id,
            status: 'delivered'
        });

        // Send chat notification to receiver
        await this.notificationGateway.handleNewChatMessage(
            receiverObjectId,
            negotiationObjectId,
            message._id
        );

        this.logger.log(`Message sent from ${senderId} to ${receiverId} in negotiation ${negotiationId}`);
        return message;
    }

    // Send system message (for negotiation events)
    async handleSystemMessage(
        negotiationId: string | Types.ObjectId,
        content: string,
        messageType: 'system' = 'system',
        orderId?: string | Types.ObjectId,
        additionalMeta?: any
    ): Promise<MessageDocument> {
        const negotiationObjectId = typeof negotiationId === 'string' ? new Types.ObjectId(negotiationId) : negotiationId;
        const orderObjectId = orderId ? (typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId) : undefined;

        // Create system message
        const systemMessage = await this.negotiationService.createSystemMessage({
            negotiationId: negotiationObjectId,
            content,
            messageType,
            orderId: orderObjectId,
            ...additionalMeta
        });

        // Emit system message to negotiation room
        this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.SYSTEM_MESSAGE, {
            ...systemMessage.toObject(),
            status: 'delivered'
        });

        // Get negotiation participants to send chat notifications
        const negotiation = await this.negotiationService.getNegotiationDetail(negotiationObjectId.toString());
        if (negotiation) {
            // Send chat notification to both participants
            await this.notificationGateway.handleNewChatMessage(
                negotiation.senderId,
                negotiationObjectId,
                systemMessage._id
            );
            await this.notificationGateway.handleNewChatMessage(
                negotiation.receiverId,
                negotiationObjectId,
                systemMessage._id
            );
        }

        this.logger.log(`System message sent to negotiation ${negotiationId}: ${content}`);
        return systemMessage;
    }

    // Send initial counter offer message when negotiation is created
    async handleInitialCounterOffer(
        senderId: string | Types.ObjectId,
        receiverId: string | Types.ObjectId,
        negotiationId: string | Types.ObjectId,
        offerPrice: number,
        orderId: string | Types.ObjectId
    ): Promise<MessageDocument> {
        const senderObjectId = typeof senderId === 'string' ? new Types.ObjectId(senderId) : senderId;
        const receiverObjectId = typeof receiverId === 'string' ? new Types.ObjectId(receiverId) : receiverId;
        const negotiationObjectId = typeof negotiationId === 'string' ? new Types.ObjectId(negotiationId) : negotiationId;
        const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

        // Create initial counter offer message
        const message = await this.negotiationService.createMessage({
            userId: senderObjectId,
            receiverId: receiverObjectId,
            negotiationId: negotiationObjectId,
            orderId: orderObjectId,
            content: `Counter-offer: ${offerPrice}`,
            offerPrice,
            messageType: 'user',
            status: 'sent'
        });

        // Emit message to negotiation room
        this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.MESSAGE_SENT, {
            ...message.toObject(),
            status: 'sent'
        });

        // Update to delivered
        await this.updateMessageStatus(message._id, 'delivered');

        // Emit delivered status
        this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, {
            messageId: message._id,
            status: 'delivered'
        });

        // Send chat notification to receiver
        await this.notificationGateway.handleNewChatMessage(
            receiverObjectId,
            negotiationObjectId,
            message._id
        );

        this.logger.log(`Initial counter offer sent: ${offerPrice} from ${senderId} to ${receiverId}`);
        return message;
    }

    // Send rejection message with counter offer
    async handleRejectionWithCounterOffer(
        senderId: string | Types.ObjectId,
        receiverId: string | Types.ObjectId,
        negotiationId: string | Types.ObjectId,
        offerPrice: number,
        orderId: string | Types.ObjectId
    ): Promise<MessageDocument> {
        const senderObjectId = typeof senderId === 'string' ? new Types.ObjectId(senderId) : senderId;
        const receiverObjectId = typeof receiverId === 'string' ? new Types.ObjectId(receiverId) : receiverId;
        const negotiationObjectId = typeof negotiationId === 'string' ? new Types.ObjectId(negotiationId) : negotiationId;
        const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

        // Create rejection with counter offer message
        const message = await this.negotiationService.createMessage({
            userId: senderObjectId,
            receiverId: receiverObjectId,
            negotiationId: negotiationObjectId,
            orderId: orderObjectId,
            content: `Rejected offer. Counter-offer: ${offerPrice}`,
            offerPrice,
            messageType: 'user',
            status: 'sent'
        });

        // Emit message to negotiation room
        this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.MESSAGE_SENT, {
            ...message.toObject(),
            status: 'sent'
        });

        // Update to delivered
        await this.updateMessageStatus(message._id, 'delivered');

        // Emit delivered status
        this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, {
            messageId: message._id,
            status: 'delivered'
        });

        // Send chat notification to receiver
        await this.notificationGateway.handleNewChatMessage(
            receiverObjectId,
            negotiationObjectId,
            message._id
        );

        this.logger.log(`Rejection with counter offer sent: ${offerPrice} from ${senderId} to ${receiverId}`);
        return message;
    }

    // Mark message as read
    async handleMarkMessageRead(
        messageId: string | Types.ObjectId,
        userId: string | Types.ObjectId
    ): Promise<void> {
        const messageObjectId = typeof messageId === 'string' ? new Types.ObjectId(messageId) : messageId;
        const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

        // Update message status to read
        await this.updateMessageStatus(messageObjectId, 'read');

        // Get message to find negotiation
        const message = await this.negotiationService.getMessage(messageObjectId.toString());
        if (message) {
            // Emit read status to negotiation room
            this.server.to(message.negotiationId.toString()).emit(SOCKET_EVENTS.MESSAGE_STATUS_UPDATED, {
                messageId: messageObjectId,
                status: 'read',
                readBy: userObjectId
            });

            this.logger.log(`Message ${messageId} marked as read by user ${userId}`);
        }
    }

    // Update message status (sent -> delivered -> read)
    async updateMessageStatus(
        messageId: string | Types.ObjectId,
        status: 'sent' | 'delivered' | 'read'
    ): Promise<void> {
        await this.negotiationService.updateMessageStatus(messageId, status);
    }

    // Get unread message count for a user in a negotiation
    async getUnreadMessageCount(
        negotiationId: string | Types.ObjectId,
        userId: string | Types.ObjectId
    ): Promise<number> {
        return await this.negotiationService.getUnreadMessagesCount(negotiationId, userId);
    }
}
