import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketService } from 'src/modules/socket/socket.service';
import { NotificationGateway } from 'src/modules/notification/gateway/notification.gateway';
import { Types } from 'mongoose';

@Injectable()
export class OrderGateway {
    private logger = new Logger('OrderGateway');
    private server: Server;

    constructor(
        private readonly socketService: SocketService,
        private readonly notificationGateway: NotificationGateway,
    ) {
        this.server = this.socketService.getServer();
    }

    // Handle new order creation notification
    async handleNewOrder(recipientId: string | Types.ObjectId, orderId: string | Types.ObjectId, orderType: 'product' | 'truck') {
        const recipientObjectId = typeof recipientId === 'string' ? new Types.ObjectId(recipientId) : recipientId;
        const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

        if (orderType === 'product') {
            await this.notificationGateway.handleNewProductOrder(recipientObjectId, orderObjectId);
        } else if (orderType === 'truck') {
            await this.notificationGateway.handleNewTruckOrder(recipientObjectId, orderObjectId);
        }

        this.logger.log(`New ${orderType} order notification sent to user ${recipientId}`);
    }

    // Handle order status change notification
    async handleOrderStatusChange(
        recipientId: string | Types.ObjectId,
        orderId: string | Types.ObjectId,
        orderType: 'product' | 'truck',
        status: string
    ) {
        const recipientObjectId = typeof recipientId === 'string' ? new Types.ObjectId(recipientId) : recipientId;
        const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

        if (orderType === 'product') {
            await this.notificationGateway.handleProductOrderStatusUpdate(recipientObjectId, orderObjectId, status);
        } else if (orderType === 'truck') {
            await this.notificationGateway.handleTruckOrderStatusUpdate(recipientObjectId, orderObjectId, status);
        }

        this.logger.log(`Order status change notification sent to user ${recipientId} for order ${orderId} - new status: ${status}`);
    }

    // Handle order update based on description (for more specific notifications)
    async handleOrderUpdate(
        recipientId: string | Types.ObjectId,
        orderId: string | Types.ObjectId,
        orderType: 'product' | 'truck',
        description: string,
        additionalInfo?: { status?: string; rfqStatus?: string; price?: number; negotiationId?: Types.ObjectId }
    ) {
        const recipientObjectId = typeof recipientId === 'string' ? new Types.ObjectId(recipientId) : recipientId;
        const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;

        // Use the NotificationGateway's custom order update method
        await this.notificationGateway.handleCustomOrderUpdate(
            recipientObjectId,
            orderObjectId,
            orderType,
            description,
            additionalInfo
        );

        this.logger.log(`Order update notification sent to user ${recipientId} for order ${orderId} - description: ${description}`);
    }
}
