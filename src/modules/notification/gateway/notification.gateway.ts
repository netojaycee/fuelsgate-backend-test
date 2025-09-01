import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketService } from 'src/modules/socket/socket.service';
import { NotificationService } from '../services/notification.service';
import { Types } from 'mongoose';

@Injectable()
export class NotificationGateway {
    private logger = new Logger('NotificationGateway');
    private server: Server;

    constructor(
        private readonly socketService: SocketService,
        private readonly notificationService: NotificationService,
    ) {
        this.server = this.socketService.getServer();
    }

    // Handle new product order notification
    async handleNewProductOrder(userId: Types.ObjectId, orderId: Types.ObjectId) {
        const notification = await this.notificationService.createNotification({
            userId,
            type: 'new_product_order',
            message: 'New product order created',
            relatedId: orderId,
            meta: { orderType: 'product' }
        });

        // Get unread count for product orders
        const productOrderCount = await this.getUnreadCountByType(userId, 'product_order');

        // Emit to user's room
        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: 'product_order',
            count: productOrderCount,
            notification
        });

        this.logger.log(`New product order notification sent to user ${userId}`);
    }

    // Handle new truck order notification
    async handleNewTruckOrder(userId: Types.ObjectId, orderId: Types.ObjectId) {
        const notification = await this.notificationService.createNotification({
            userId,
            type: 'new_truck_order',
            message: 'New truck order created',
            relatedId: orderId,
            meta: { orderType: 'truck' }
        });

        const truckOrderCount = await this.getUnreadCountByType(userId, 'truck_order');

        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: 'truck_order',
            count: truckOrderCount,
            notification
        });

        this.logger.log(`New truck order notification sent to user ${userId}`);
    }

    // Handle new quote notification (for buyers)
    async handleNewQuote(userId: Types.ObjectId, orderId: Types.ObjectId, orderType: 'product' | 'truck') {
        const notification = await this.notificationService.createNotification({
            userId,
            type: `new_${orderType}_quote`,
            message: `New quote received for ${orderType} order`,
            relatedId: orderId,
            meta: { orderType, notificationCategory: `${orderType}_order` }
        });

        const orderCount = await this.getUnreadCountByType(userId, `${orderType}_order`);

        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: `${orderType}_order`,
            count: orderCount,
            notification
        });

        this.logger.log(`New ${orderType} quote notification sent to user ${userId}`);
    }

    // Handle new chat message notification
    async handleNewChatMessage(userId: Types.ObjectId, negotiationId: Types.ObjectId, messageId: Types.ObjectId) {
        const notification = await this.notificationService.createNotification({
            userId,
            type: 'new_chat_message',
            message: 'New message in negotiation',
            relatedId: negotiationId,
            meta: { messageId, notificationCategory: 'chat' }
        });

        const chatCount = await this.getUnreadCountByType(userId, 'chat');

        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: 'chat',
            count: chatCount,
            notification
        });

        this.logger.log(`New chat message notification sent to user ${userId}`);
    }

    // Handle product order status update notification
    async handleProductOrderStatusUpdate(userId: Types.ObjectId, orderId: Types.ObjectId, status: string) {
        const notification = await this.notificationService.createNotification({
            userId,
            type: 'product_order_status_update',
            message: `Product order status updated to ${status}`,
            relatedId: orderId,
            meta: { orderType: 'product', status, notificationCategory: 'product_order' }
        });

        const productOrderCount = await this.getUnreadCountByType(userId, 'product_order');

        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: 'product_order',
            count: productOrderCount,
            notification
        });

        this.logger.log(`Product order status update notification sent to user ${userId} - status: ${status}`);
    }

    // Handle truck order status update notification
    async handleTruckOrderStatusUpdate(userId: Types.ObjectId, orderId: Types.ObjectId, status: string) {
        const notification = await this.notificationService.createNotification({
            userId,
            type: 'truck_order_status_update',
            message: `Truck order status updated to ${status}`,
            relatedId: orderId,
            meta: { orderType: 'truck', status, notificationCategory: 'truck_order' }
        });

        const truckOrderCount = await this.getUnreadCountByType(userId, 'truck_order');

        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: 'truck_order',
            count: truckOrderCount,
            notification
        });

        this.logger.log(`Truck order status update notification sent to user ${userId} - status: ${status}`);
    }

    // Handle custom order update notification (for RFQ, acceptance, rejection, etc.)
    async handleCustomOrderUpdate(
        userId: Types.ObjectId,
        orderId: Types.ObjectId,
        orderType: 'product' | 'truck',
        description: string,
        additionalInfo?: { status?: string; rfqStatus?: string; price?: number; negotiationId?: Types.ObjectId }
    ) {
        let notificationMessage = '';
        let notificationType = '';

        switch (description) {
            case 'sending_rfq':
                notificationMessage = `New quote received for truck order`;
                notificationType = 'truck_rfq_sent';
                break;
            case 'accepting_order':
                notificationMessage = `Your ${orderType} order has been accepted`;
                notificationType = `${orderType}_order_accepted`;
                break;
            case 'rejecting_order':
                // If a negotiation was created (counter offer), send chat notification instead
                if (additionalInfo?.negotiationId) {
                    // Create a chat notification for the new negotiation (first message in chat)
                    const notification = await this.notificationService.createNotification({
                        userId,
                        type: 'new_chat_message',
                        message: 'New counter offer received in negotiation',
                        relatedId: additionalInfo.negotiationId,
                        meta: {
                            negotiationId: additionalInfo.negotiationId,
                            notificationCategory: 'chat',
                            orderType,
                            isCounterOffer: true
                        }
                    });

                    const chatCount = await this.getUnreadCountByType(userId, 'chat');

                    this.server.to(userId.toString()).emit('notification', {
                        type: 'badge_update',
                        category: 'chat',
                        count: chatCount,
                        notification
                    });

                    this.logger.log(`Order rejection with counter offer - chat notification sent to user ${userId}`);
                    return; // Exit early, don't send order rejection notification
                }
                notificationMessage = `Your ${orderType} order has been rejected`;
                notificationType = `${orderType}_order_rejected`;
                break;
            case 'order_to_in_progress':
                notificationMessage = `Your ${orderType} order is now in progress`;
                notificationType = `${orderType}_order_in_progress`;
                break;
            case 'order_to_completed':
                notificationMessage = `Your ${orderType} order has been completed`;
                notificationType = `${orderType}_order_completed`;
                break;
            default:
                notificationMessage = `Your ${orderType} order has been updated`;
                notificationType = `${orderType}_order_update`;
        }

        const notification = await this.notificationService.createNotification({
            userId,
            type: notificationType,
            message: notificationMessage,
            relatedId: orderId,
            meta: {
                orderType,
                description,
                status: additionalInfo?.status,
                rfqStatus: additionalInfo?.rfqStatus,
                price: additionalInfo?.price,
                notificationCategory: orderType === 'truck' ? 'truck_order' : 'product_order'
            }
        });

        const categoryCount = await this.getUnreadCountByType(userId, orderType === 'truck' ? 'truck_order' : 'product_order');

        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: orderType === 'truck' ? 'truck_order' : 'product_order',
            count: categoryCount,
            notification
        });

        this.logger.log(`Custom order update notification sent to user ${userId} - description: ${description}`);
    }

    // Mark notifications as read when user clicks on nav link
    async markCategoryAsRead(userId: Types.ObjectId, category: 'chat' | 'product_order' | 'truck_order') {
        // Mark all notifications of this category as read
        await this.notificationService.markCategoryAsRead(userId, category);

        // Emit updated count (should be 0)
        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category,
            count: 0
        });

        this.logger.log(`Marked ${category} notifications as read for user ${userId}`);
    }

    // Helper method to get unread count by category
    private async getUnreadCountByType(userId: Types.ObjectId, category: string): Promise<number> {
        // This will query notifications by type patterns
        const typePatterns = {
            'product_order': [
                'new_product_order',
                'new_product_quote',
                'product_order_status_update',
                'product_order_accepted',
                'product_order_rejected',
                'product_order_in_progress',
                'product_order_completed',
                'product_order_cancelled',
                'product_order_update'
            ],
            'truck_order': [
                'new_truck_order',
                'new_truck_quote',
                'truck_order_status_update',
                'truck_rfq_sent',
                'truck_order_accepted',
                'truck_order_rejected',
                'truck_order_in_progress',
                'truck_order_completed',
                'truck_order_cancelled',
                'truck_order_update'
            ],
            'chat': [
                'new_chat_message',
                'negotiation_accepted',
                'negotiation_cancelled'
            ]
        };

        return await this.notificationService.getUnreadCountByTypes(userId, typePatterns[category] || []);
    }

    // Get all unread counts for frontend initialization
    async getAllUnreadCounts(userId: Types.ObjectId) {
        const productOrderCount = await this.getUnreadCountByType(userId, 'product_order');
        const truckOrderCount = await this.getUnreadCountByType(userId, 'truck_order');
        const chatCount = await this.getUnreadCountByType(userId, 'chat');

        return {
            product_order: productOrderCount,
            truck_order: truckOrderCount,
            chat: chatCount
        };
    }

    // Handle negotiation acceptance notification
    async handleNegotiationAccepted(
        userId: Types.ObjectId,
        negotiationId: Types.ObjectId,
        orderId: Types.ObjectId,
        orderType: 'product' | 'truck'
    ) {
        // Send both chat notification (for system message) and order notification (for order status change)

        // Chat notification for system message
        const chatNotification = await this.notificationService.createNotification({
            userId,
            type: 'negotiation_accepted',
            message: 'Your negotiation has been accepted',
            relatedId: negotiationId,
            meta: {
                negotiationId,
                orderId,
                orderType,
                notificationCategory: 'chat'
            }
        });

        // Order notification for status change
        const orderNotification = await this.notificationService.createNotification({
            userId,
            type: `${orderType}_order_in_progress`,
            message: `Your ${orderType} order is now in progress`,
            relatedId: orderId,
            meta: {
                negotiationId,
                orderId,
                orderType,
                status: 'in-progress',
                notificationCategory: `${orderType}_order`
            }
        });

        const chatCount = await this.getUnreadCountByType(userId, 'chat');
        const orderCount = await this.getUnreadCountByType(userId, `${orderType}_order`);

        // Emit chat notification
        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: 'chat',
            count: chatCount,
            notification: chatNotification
        });

        // Emit order notification
        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: `${orderType}_order`,
            count: orderCount,
            notification: orderNotification
        });

        this.logger.log(`Negotiation acceptance notifications sent to user ${userId}`);
    }

    // Handle negotiation cancellation notification
    async handleNegotiationCancelled(
        userId: Types.ObjectId,
        negotiationId: Types.ObjectId,
        orderId: Types.ObjectId,
        orderType: 'product' | 'truck'
    ) {
        // Send both chat notification (for system message) and order notification (for order cancellation)

        // Chat notification for system message
        const chatNotification = await this.notificationService.createNotification({
            userId,
            type: 'negotiation_cancelled',
            message: 'Negotiation has been cancelled',
            relatedId: negotiationId,
            meta: {
                negotiationId,
                orderId,
                orderType,
                notificationCategory: 'chat'
            }
        });

        // Order notification for cancellation
        const orderNotification = await this.notificationService.createNotification({
            userId,
            type: `${orderType}_order_cancelled`,
            message: `Your ${orderType} order has been cancelled`,
            relatedId: orderId,
            meta: {
                negotiationId,
                orderId,
                orderType,
                status: 'cancelled',
                notificationCategory: `${orderType}_order`
            }
        });

        const chatCount = await this.getUnreadCountByType(userId, 'chat');
        const orderCount = await this.getUnreadCountByType(userId, `${orderType}_order`);

        // Emit chat notification
        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: 'chat',
            count: chatCount,
            notification: chatNotification
        });

        // Emit order notification
        this.server.to(userId.toString()).emit('notification', {
            type: 'badge_update',
            category: `${orderType}_order`,
            count: orderCount,
            notification: orderNotification
        });

        this.logger.log(`Negotiation cancellation notifications sent to user ${userId}`);
    }
}
