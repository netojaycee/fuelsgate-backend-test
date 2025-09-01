import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { SocketService } from 'src/modules/socket/socket.service';
import { NotificationGateway } from 'src/modules/notification/gateway/notification.gateway';
import { MessageGateway } from 'src/modules/message/gateway/message.gateway';
import { OrderGateway } from 'src/modules/order/gateway/order.gateway';
import { Types } from 'mongoose';
import { NegotiationService } from '../services/negotiation.service';
import { OrderService } from 'src/modules/order/services/order.service';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { OrderRepository } from 'src/modules/order/repositories/order.repository';
import { ResendService } from 'src/modules/resend/resend.service';
import { join } from 'path';
import { SOCKET_EVENTS } from 'src/utils/SocketEvents';

@Injectable()
export class NegotiationGateway {
    private logger = new Logger('NegotiationGateway');
    private server: Server;

    constructor(
        private readonly socketService: SocketService,
        private readonly notificationGateway: NotificationGateway,
        private readonly messageGateway: MessageGateway,
        private readonly orderGateway: OrderGateway,
        private readonly negotiationService: NegotiationService,
        private readonly orderService: OrderService,
        private readonly userRepository: UserRepository,
        private readonly orderRepository: OrderRepository,
        private readonly resendService: ResendService,
    ) {
        this.server = this.socketService.getServer();
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.server.on('connection', (client) => {
            this.logger.log(`Client connected to NegotiationGateway: ${client.id}`);

            // Listen for accept negotiation events
            client.on(SOCKET_EVENTS.ACCEPT_NEGOTIATION, (data) => {
                this.handleAcceptNegotiationSocket(client, data);
            });

            // Listen for reject negotiation events
            client.on(SOCKET_EVENTS.REJECT_NEGOTIATION, (data) => {
                this.handleRejectNegotiationSocket(client, data);
            });

            // Listen for cancel negotiation events
            client.on(SOCKET_EVENTS.CANCEL_NEGOTIATION, (data) => {
                this.handleCancelNegotiationSocket(client, data);
            });
        });
    }

    // Socket event handlers
    async handleAcceptNegotiationSocket(client: any, data: {
        negotiationId: string;
        orderId?: string;
        acceptingUserId: string;
        user: any;
    }): Promise<void> {
        this.logger.log(`Socket: Accept negotiation ${data.negotiationId} by user ${data.acceptingUserId}`);

        try {
            await this.handleAcceptNegotiation(
                data.negotiationId,
                data.orderId || '',
                data.acceptingUserId,
                data.user
            );
        } catch (error) {
            this.logger.error('Error accepting negotiation via socket:', error);
            client.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to accept negotiation' });
        }
    }

    async handleRejectNegotiationSocket(client: any, data: {
        negotiationId: string;
        orderId?: string;
        rejectingUserId: string;
        counterOfferPrice?: number;
        user: any;
    }): Promise<void> {
        this.logger.log(`Socket: Reject negotiation ${data.negotiationId} with counter offer ${data.counterOfferPrice}`);

        try {
            if (data.counterOfferPrice) {
                // Rejection with counter offer - use MessageGateway
                await this.messageGateway.handleRejectionWithCounterOffer(
                    data.rejectingUserId,
                    data.negotiationId, // receiverId will be determined by MessageGateway
                    data.negotiationId,
                    data.counterOfferPrice,
                    data.orderId || ''
                );
            } else {
                // Simple rejection without counter offer - use NegotiationGateway with 0 as placeholder
                await this.handleRejectNegotiation(
                    data.negotiationId,
                    data.orderId || '',
                    data.rejectingUserId,
                    0, // Placeholder price for simple rejection
                    data.user
                );
            }
        } catch (error) {
            this.logger.error('Error rejecting negotiation via socket:', error);
            client.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to reject negotiation' });
        }
    }

    async handleCancelNegotiationSocket(client: any, data: {
        negotiationId: string;
        orderId?: string;
        cancellingUserId: string;
        user: any;
    }): Promise<void> {
        this.logger.log(`Socket: Cancel negotiation ${data.negotiationId} by user ${data.cancellingUserId}`);

        try {
            await this.handleCancelNegotiation(
                data.negotiationId,
                data.orderId || '',
                data.cancellingUserId,
                data.user
            );
        } catch (error) {
            this.logger.error('Error cancelling negotiation via socket:', error);
            client.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to cancel negotiation' });
        }
    }

    // Core business logic methods (existing methods)
    async handleAcceptNegotiation(
        negotiationId: string | Types.ObjectId,
        orderId: string | Types.ObjectId,
        acceptingUserId: string | Types.ObjectId,
        user: any
    ): Promise<void> {
        const negotiationObjectId = typeof negotiationId === 'string' ? new Types.ObjectId(negotiationId) : negotiationId;
        const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;
        const acceptingUserObjectId = typeof acceptingUserId === 'string' ? new Types.ObjectId(acceptingUserId) : acceptingUserId;

        try {
            // Accept negotiation
            const negotiation = await this.negotiationService.acceptNegotiation(negotiationObjectId.toString(), user);

            // Get last message for offer price
            const lastMessage = await this.negotiationService.fetchLastMessage(negotiationObjectId.toString());
            const offerPrice = lastMessage?.offerPrice;

            // Update order status to in-progress
            const order = await this.orderService.acceptNegotiationOrder(orderObjectId.toString(), user, offerPrice);

            // Get user details for system message
            const userDetails = await this.userRepository.findOne(acceptingUserObjectId);

            // Send system message about acceptance
            await this.messageGateway.handleSystemMessage(
                negotiationObjectId,
                `${userDetails?.firstName || 'User'} accepted the negotiation`,
                'system',
                orderObjectId
            );

            // Send notifications to both participants
            await this.notificationGateway.handleNegotiationAccepted(
                negotiation.senderId,
                negotiationObjectId,
                orderObjectId,
                order.type as 'product' | 'truck'
            );
            await this.notificationGateway.handleNegotiationAccepted(
                negotiation.receiverId,
                negotiationObjectId,
                orderObjectId,
                order.type as 'product' | 'truck'
            );

            // Emit socket events to negotiation room
            this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.NEGOTIATION_ACCEPTED, {
                negotiationId: negotiationObjectId,
                orderId: orderObjectId,
                status: 'completed',
                order: order.toObject()
            });

            // Handle competing negotiations for truck orders
            if (order.type === 'truck') {
                await this.handleCompetingNegotiations(orderObjectId, negotiationObjectId, order.truckId);
            }

            // Send acceptance email
            await this.sendAcceptanceEmail(negotiation, order, userDetails);

            this.logger.log(`Negotiation ${negotiationId} accepted successfully`);

        } catch (error) {
            this.logger.error(`Error accepting negotiation ${negotiationId}:`, error);
            throw error;
        }
    }

    // Handle negotiation rejection with counter offer
    async handleRejectNegotiation(
        negotiationId: string | Types.ObjectId,
        orderId: string | Types.ObjectId,
        rejectingUserId: string | Types.ObjectId,
        counterOfferPrice: number,
        user: any
    ): Promise<void> {
        const negotiationObjectId = typeof negotiationId === 'string' ? new Types.ObjectId(negotiationId) : negotiationId;
        const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;
        const rejectingUserObjectId = typeof rejectingUserId === 'string' ? new Types.ObjectId(rejectingUserId) : rejectingUserId;

        try {
            // Reject negotiation and send counter offer
            const message = await this.negotiationService.rejectNegotiation(
                negotiationObjectId.toString(),
                counterOfferPrice,
                user
            );

            // Get order details
            const order = await this.orderRepository.findOrderById(orderObjectId.toString());

            // Send rejection with counter offer message via MessageGateway
            await this.messageGateway.handleRejectionWithCounterOffer(
                rejectingUserObjectId,
                message.receiverId,
                negotiationObjectId,
                counterOfferPrice,
                orderObjectId
            );

            // Emit socket events to negotiation room
            this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.NEGOTIATION_REJECTED, {
                negotiationId: negotiationObjectId,
                orderId: orderObjectId,
                counterOffer: counterOfferPrice,
                message: message.toObject(),
                order: order?.toObject()
            });

            this.logger.log(`Negotiation ${negotiationId} rejected with counter offer: ${counterOfferPrice}`);

        } catch (error) {
            this.logger.error(`Error rejecting negotiation ${negotiationId}:`, error);
            throw error;
        }
    }

    // Handle negotiation cancellation
    async handleCancelNegotiation(
        negotiationId: string | Types.ObjectId,
        orderId: string | Types.ObjectId,
        cancellingUserId: string | Types.ObjectId,
        user: any
    ): Promise<void> {
        const negotiationObjectId = typeof negotiationId === 'string' ? new Types.ObjectId(negotiationId) : negotiationId;
        const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;
        const cancellingUserObjectId = typeof cancellingUserId === 'string' ? new Types.ObjectId(cancellingUserId) : cancellingUserId;

        try {
            // Cancel negotiation
            const negotiation = await this.negotiationService.cancelNegotiation(negotiationObjectId.toString(), user);

            // Cancel order
            const order = await this.orderService.cancelOrder(orderObjectId.toString(), user);

            // Get user details for system message
            const userDetails = await this.userRepository.findOne(cancellingUserObjectId);

            // Send system message about cancellation
            await this.messageGateway.handleSystemMessage(
                negotiationObjectId,
                `${userDetails?.firstName || 'User'} cancelled the negotiation`,
                'system',
                orderObjectId
            );

            // Send notifications to both participants
            await this.notificationGateway.handleNegotiationCancelled(
                negotiation.senderId,
                negotiationObjectId,
                orderObjectId,
                order.type as 'product' | 'truck'
            );
            await this.notificationGateway.handleNegotiationCancelled(
                negotiation.receiverId,
                negotiationObjectId,
                orderObjectId,
                order.type as 'product' | 'truck'
            );

            // Emit socket events to negotiation room
            this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.NEGOTIATION_CANCELLED, {
                negotiationId: negotiationObjectId,
                orderId: orderObjectId,
                status: 'cancelled',
                negotiation: negotiation.toObject(),
                order: order.toObject()
            });

            // Send cancellation email
            await this.sendCancellationEmail(negotiation, order, userDetails);

            this.logger.log(`Negotiation ${negotiationId} cancelled successfully`);

        } catch (error) {
            this.logger.error(`Error cancelling negotiation ${negotiationId}:`, error);
            throw error;
        }
    }

    // Handle competing negotiations for the same truck
    private async handleCompetingNegotiations(
        acceptedOrderId: Types.ObjectId,
        acceptedNegotiationId: Types.ObjectId,
        truckId: Types.ObjectId
    ): Promise<void> {
        try {
            // Find other ongoing orders for the same truck
            const competingOrders = await this.orderRepository.findOrders({
                truckId,
                _id: { $ne: acceptedOrderId },
                status: { $ne: 'completed' }
            });

            for (const competingOrder of competingOrders) {
                // Find active negotiations for this order
                const negotiations = await this.negotiationService.getAllNegotiations({
                    orderId: competingOrder._id.toString(),
                    status: 'ongoing'
                });

                for (const negotiation of negotiations) {
                    // Cancel the competing negotiation
                    await this.negotiationService.updateNegotiationStatus(
                        negotiation._id.toString(),
                        'cancelled',
                        { id: 'system' } as any
                    );

                    // Send system message about automatic cancellation
                    await this.messageGateway.handleSystemMessage(
                        negotiation._id,
                        'This negotiation has been automatically cancelled because the truck has been allocated to another order',
                        'system',
                        competingOrder._id
                    );

                    // Send notifications to affected users
                    await this.notificationGateway.handleNegotiationCancelled(
                        negotiation.senderId,
                        negotiation._id,
                        competingOrder._id,
                        competingOrder.type as 'product' | 'truck'
                    );
                    await this.notificationGateway.handleNegotiationCancelled(
                        negotiation.receiverId,
                        negotiation._id,
                        competingOrder._id,
                        competingOrder.type as 'product' | 'truck'
                    );

                    // Emit cancellation events
                    this.server.to(negotiation._id.toString()).emit(SOCKET_EVENTS.NEGOTIATION_CANCELLED, {
                        negotiationId: negotiation._id,
                        orderId: competingOrder._id,
                        status: 'cancelled',
                        reason: 'truck_allocated_elsewhere'
                    });

                    // Send cancellation email
                    const recipient = await this.userRepository.findOne(negotiation.senderId);
                    if (recipient) {
                        await this.sendCompetingNegotiationCancellationEmail(negotiation, competingOrder, recipient);
                    }
                }

                // Cancel the competing order
                await this.orderService.cancelOrder(competingOrder._id.toString(), { id: 'system' } as any);
            }

            this.logger.log(`Handled ${competingOrders.length} competing orders for truck ${truckId}`);

        } catch (error) {
            this.logger.error(`Error handling competing negotiations:`, error);
        }
    }

    // Send acceptance email
    private async sendAcceptanceEmail(negotiation: any, order: any, acceptingUser: any): Promise<void> {
        const recipient = await this.userRepository.findOne(
            negotiation.senderId.toString() === acceptingUser._id.toString()
                ? negotiation.receiverId
                : negotiation.senderId
        );

        if (recipient) {
            await this.resendService.sendMail({
                to: recipient.email,
                subject: `Negotiation Accepted - Order ${order._id}`,
                template: join(__dirname, '../mails/negotiation-accepted.ejs'),
                context: {
                    Recipient: `${recipient.firstName} ${recipient.lastName}`,
                    AcceptingUser: `${acceptingUser.firstName} ${acceptingUser.lastName}`,
                    OrderId: order._id,
                    OrderType: order.type,
                    Price: order.price,
                    Status: 'accepted',
                    Time: new Date().toLocaleString(),
                    OrderUrl: `${process.env.FRONTEND_URL}/dashboard/${order.type === 'truck' ? 'my-rfq' : 'my-order'}/${order._id}`,
                },
            });
        }
    }

    // Send cancellation email
    private async sendCancellationEmail(negotiation: any, order: any, cancellingUser: any): Promise<void> {
        const recipient = await this.userRepository.findOne(
            negotiation.senderId.toString() === cancellingUser._id.toString()
                ? negotiation.receiverId
                : negotiation.senderId
        );

        if (recipient) {
            await this.resendService.sendMail({
                to: recipient.email,
                subject: `Negotiation Cancelled - Order ${order._id}`,
                template: join(__dirname, '../../mails/negotiation-cancelled.ejs'),
                context: {
                    Recipient: `${recipient.firstName} ${recipient.lastName}`,
                    CancellingUser: `${cancellingUser.firstName} ${cancellingUser.lastName}`,
                    OrderId: order._id,
                    OrderType: order.type,
                    Status: 'cancelled',
                    Time: new Date().toLocaleString(),
                    DashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
                },
            });
        }
    }

    // Send competing negotiation cancellation email
    private async sendCompetingNegotiationCancellationEmail(negotiation: any, order: any, recipient: any): Promise<void> {
        await this.resendService.sendMail({
            to: recipient.email,
            subject: `Order Cancelled - Truck Allocated Elsewhere`,
            template: join(__dirname, '../../mails/order-cancelled-competing.ejs'),
            context: {
                Recipient: `${recipient.firstName} ${recipient.lastName}`,
                OrderId: order._id,
                OrderType: order.type,
                Reason: 'The truck has been allocated to another order',
                Time: new Date().toLocaleString(),
                DashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
            },
        });
    }
}
