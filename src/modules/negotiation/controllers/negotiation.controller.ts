import { Controller, Post, Get, Put, Delete, Body, Param, Query, Request, UseGuards, Logger } from '@nestjs/common';
import { NegotiationService } from '../services/negotiation.service';
import { NegotiationDto, NegotiationQueryDto, NegotiationStatus } from '../dto/negotiation.dto';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { YupValidationPipe } from 'src/shared/pipes/yup-validation.pipe';
import { negotiationSchema, negotiationStatusSchema } from '../validations/negotiation.validation';
import { OrderService } from 'src/modules/order/services/order.service';
import { NotificationGateway } from 'src/modules/notification/gateway/notification.gateway';
import { MessageGateway } from 'src/modules/message/gateway/message.gateway';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { OrderRepository } from 'src/modules/order/repositories/order.repository';
import { NegotiationRepository } from '../repositories/negotiation.repository';
import { ResendService } from 'src/modules/resend/resend.service';
import { SocketService } from 'src/modules/socket/socket.service';
import { SOCKET_EVENTS } from 'src/utils/SocketEvents';
import { Types } from 'mongoose';
import * as fs from 'fs';
import { join } from 'path';
import { getHtmlWithFooter } from 'src/utils/helpers';

@Controller('negotiation')
@UseGuards(JwtAuthGuard)
export class NegotiationController {
    private logger = new Logger('NegotiationController');
    private server: any;

    constructor(
        private readonly negotiationService: NegotiationService,
        private readonly orderService: OrderService,
        private readonly notificationGateway: NotificationGateway,
        private readonly messageGateway: MessageGateway,
        private readonly userRepository: UserRepository,
        private readonly orderRepository: OrderRepository,
        private readonly negotiationRepository: NegotiationRepository,
        private readonly resendService: ResendService,
        private readonly socketService: SocketService,
    ) {
        this.server = this.socketService.getServer();
    }

    @Post()
    async createNegotiation(
        @Body(new YupValidationPipe(negotiationSchema)) negotiationData: NegotiationDto,
        @Request() req,
    ) {
        const { user } = req;
        return this.negotiationService.createNegotiation(negotiationData, user);
    }

    // @Get()
    // async getAllNegotiations(@Query() query: NegotiationQueryDto) {
    //     return this.negotiationService.getAllNegotiations(query);
    // }
    @Get()
    async getAllNegotiations(@Query() query: NegotiationQueryDto, @Request() req) {
        const { user } = req;
        const negotiations = await this.negotiationService.getAllNegotiations({
            ...query,
            profileId: user.id,
        });
        const total = await this.negotiationService.getAllNegotiationsCount({
            ...query,
            profileId: user.id,
        });
        const hasMore = (query.page || 1) * (query.limit || 20) < total;
        return {
            data: await Promise.all(
                negotiations.map(async (n) => ({
                    ...n,
                    unreadCount: await this.negotiationService.getUnreadMessagesCount(n._id, user.id),
                })),
            ),
            total,
            hasMore,
        };
    }

    @Get(':id')
    async getNegotiationById(@Param('id') id: string) {
        return this.negotiationService.getNegotiationDetail(id);
    }

    @Put(':id/status')
    async updateNegotiationStatus(
        @Param('id') id: string,
        @Body(new YupValidationPipe(negotiationStatusSchema)) data: { status: NegotiationStatus },
        @Request() req,
    ) {
        const { user } = req;
        return this.negotiationService.updateNegotiationStatus(id, data.status, user);
    }

    @Delete(':id')
    async deleteNegotiation(@Param('id') id: string, @Request() req) {
        const { user } = req;
        return this.negotiationService.deleteNegotiation(id, user);
    }

    @Post(':id/accept')
    async acceptNegotiation(@Param('id') id: string, @Request() req) {
        const { user } = req;
        const negotiationObjectId = new Types.ObjectId(id);

        try {
            // Accept negotiation
            const negotiation = await this.negotiationService.acceptNegotiation(id, user);

            // Get last message for offer price
            const lastMessage = await this.negotiationService.fetchLastMessage(id);
            const offerPrice = lastMessage?.offerPrice;

            // Update order status to in-progress
            const order = await this.orderService.acceptNegotiationOrder(negotiation.orderId.toString(), user, offerPrice);

            // Get user details for system message
            const userDetails = await this.userRepository.findOne(user.id);

            // Send system message about acceptance
            await this.messageGateway.handleSystemMessage(
                negotiationObjectId,
                `${userDetails?.firstName || 'User'} accepted the negotiation`,
                'system',
                order._id
            );

            // Send notifications to both participants
            await this.notificationGateway.handleNegotiationAccepted(
                negotiation.senderId,
                negotiationObjectId,
                order._id,
                order.type as 'product' | 'truck'
            );
            await this.notificationGateway.handleNegotiationAccepted(
                negotiation.receiverId,
                negotiationObjectId,
                order._id,
                order.type as 'product' | 'truck'
            );

            // Emit socket events to negotiation room
            this.server.to(negotiationObjectId.toString()).emit(SOCKET_EVENTS.NEGOTIATION_ACCEPTED, {
                negotiationId: negotiationObjectId,
                orderId: order._id,
                status: 'completed',
                order: order.toObject()
            });

            // Handle competing negotiations for truck orders
            if (order.type === 'truck') {
                await this.handleCompetingNegotiations(order._id, negotiationObjectId);
            }

            // Send acceptance email
            await this.sendAcceptanceEmail(negotiation, order, userDetails);

            this.logger.log(`Negotiation ${id} accepted successfully via REST API`);

            return {
                message: 'Negotiation accepted successfully',
                data: { negotiation, order },
                statusCode: 200,
            };

        } catch (error) {
            this.logger.error(`Error accepting negotiation ${id} via REST API:`, error);
            throw error;
        }
    }

    @Post(':id/reject')
    async rejectNegotiation(
        @Param('id') id: string,
        @Body() body: { offerPrice: number },
        @Request() req,
    ) {
        const { user } = req;
        const message = await this.negotiationService.rejectNegotiation(id, body.offerPrice, user);
        return {
            message: 'Counter-offer sent successfully',
            data: message,
            statusCode: 200,
        };
    }

    @Post(':id/cancel')
    async cancelNegotiation(@Param('id') id: string, @Request() req) {
        const { user } = req;
        const negotiation = await this.negotiationService.cancelNegotiation(id, user);
        const order = await this.orderService.cancelOrder(negotiation.orderId.toString(), user);
        return {
            message: 'Negotiation and order cancelled successfully',
            data: { negotiation, order },
            statusCode: 200,
        };
    }

    private async handleCompetingNegotiations(orderId: Types.ObjectId, acceptedNegotiationId: Types.ObjectId) {
        try {
            // Find all active negotiations for the same truck order
            const competingNegotiations = await this.negotiationRepository.findNegotiations({
                orderId: orderId,
                _id: { $ne: acceptedNegotiationId },
                status: 'pending'
            });

            for (const negotiation of competingNegotiations) {
                // Auto-reject competing negotiation - need to provide offerPrice (0 for auto-rejection)
                await this.negotiationService.rejectNegotiation(negotiation._id.toString(), 0, { id: 'system' });

                // Send system message
                await this.messageGateway.handleSystemMessage(
                    negotiation._id,
                    'This negotiation was automatically rejected because another negotiation was accepted',
                    'system'
                );

                // Send cancellation notification (using available method)
                await this.notificationGateway.handleNegotiationCancelled(
                    negotiation.senderId,
                    negotiation._id,
                    orderId,
                    'truck'
                );
                await this.notificationGateway.handleNegotiationCancelled(
                    negotiation.receiverId,
                    negotiation._id,
                    orderId,
                    'truck'
                );

                // Emit rejection event
                this.server.to(negotiation._id.toString()).emit(SOCKET_EVENTS.NEGOTIATION_REJECTED, {
                    negotiationId: negotiation._id,
                    orderId: orderId,
                    status: 'rejected',
                    reason: 'Another negotiation was accepted'
                });

                this.logger.log(`Auto-rejected competing negotiation ${negotiation._id} for truck order ${orderId}`);
            }
        } catch (error) {
            this.logger.error('Error handling competing negotiations:', error);
        }
    }

    private async sendAcceptanceEmail(negotiation: any, order: any, userDetails: any) {
        try {
            // Load the template
            const generalHtml = fs.readFileSync(join(__dirname, '../../../templates/negotiation-update.html'), 'utf8');

            // Format price if available
            const priceDisplay = order.finalPrice
                ? `₦${order.finalPrice.toLocaleString()}`
                : 'Not specified';

            // Prepare common template parts
            const detailsRows = `
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Final Price:</td>
                    <td style="padding:8px 0; color:#10b981; font-weight:600;">${priceDisplay}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Order Type:</td>
                    <td style="padding:8px 0; color:#666;">${order.type}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Order ID:</td>
                    <td style="padding:8px 0; color:#666;">${order._id}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Status:</td>
                    <td style="padding:8px 0; color:#666;">Accepted</td>
                </tr>
            `;

            const actionNotice = `
                <div style="background:#f5f2ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
                    <p style="font-size:16px; color:#444; margin:0;">
                        The negotiation has been successfully accepted by ${userDetails?.firstName || 'User'}. 
                        The order has been updated to in-progress status. You can proceed with the transaction process.
                    </p>
                </div>
            `;

            // Send email to sender
            if (negotiation.senderId?.email) {
                const senderHtml = generalHtml
                    .replace(/{{Sender}}/g, userDetails?.firstName || 'User')
                    .replace(/{{Recipient}}/g, `${negotiation.senderId.firstName} ${negotiation.senderId.lastName}`)
                    .replace(/{{DetailsTitle}}/g, 'Accepted Negotiation Details')
                    .replace(/{{DetailsRows}}/g, detailsRows)
                    .replace(/{{Time}}/g, new Date().toLocaleString())
                    .replace(/{{ActionNotice}}/g, actionNotice)
                    .replace(/{{NegotiationUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/chat/${negotiation._id}`);

                await this.resendService.sendMail({
                    to: negotiation.senderId.email,
                    subject: 'Negotiation Accepted - Next Steps',
                    html: getHtmlWithFooter(senderHtml),
                });
            }

            // Send email to receiver
            if (negotiation.receiverId?.email) {
                const receiverHtml = generalHtml
                    .replace(/{{Sender}}/g, userDetails?.firstName || 'User')
                    .replace(/{{Recipient}}/g, `${negotiation.receiverId.firstName} ${negotiation.receiverId.lastName}`)
                    .replace(/{{DetailsTitle}}/g, 'Accepted Negotiation Details')
                    .replace(/{{DetailsRows}}/g, detailsRows)
                    .replace(/{{Time}}/g, new Date().toLocaleString())
                    .replace(/{{ActionNotice}}/g, actionNotice)
                    .replace(/{{NegotiationUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/chat/${negotiation._id}`);

                await this.resendService.sendMail({
                    to: negotiation.receiverId.email,
                    subject: 'Negotiation Accepted - Next Steps',
                    html: getHtmlWithFooter(receiverHtml),
                });
            }

            this.logger.log(`Sent acceptance emails for negotiation ${negotiation._id}`);
        } catch (error) {
            this.logger.error('Error sending acceptance email:', error);
        }
    }
}
