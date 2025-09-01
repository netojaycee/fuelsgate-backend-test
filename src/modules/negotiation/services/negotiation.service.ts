import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Negotiation, NegotiationDocument } from '../entities/negotiation.entity';
import { NegotiationDto, NegotiationQueryDto } from '../dto/negotiation.dto';
import { ResendService } from 'src/modules/resend/resend.service';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { join } from 'path';
import { MessageDto } from 'src/modules/message/dto/message.dto';
import * as fs from 'fs';
import { Message, MessageDocument } from 'src/modules/message/entities/message.entity';
import { getHtmlWithFooter } from 'src/utils/helpers';

@Injectable()
export class NegotiationService {
    constructor(
        @InjectModel(Negotiation.name) private negotiationModel: Model<NegotiationDocument>,
        @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
        private readonly resendService: ResendService,
        private readonly userRepository: UserRepository, // Assuming you have a UserRepository to fetch user details
    ) { }

    async createNegotiation(dto: NegotiationDto, user: IJwtPayload): Promise<NegotiationDocument> {
        if (user.role !== 'buyer') {
            throw new BadRequestException('Only buyers can initiate negotiations');
        }
        const existing = await this.negotiationModel.findOne({
            senderId: new Types.ObjectId(user.id),
            receiverId: dto.receiverId,
            type: dto.type,
            status: 'ongoing',
            orderId: dto.orderId,
            // ...(dto.type === 'truck' ? { truckId: dto.truckId, truckOrderId: dto.truckOrderId } : { productUploadId: dto.productUploadId }),
        });
        if (existing) {
            throw new BadRequestException('An ongoing negotiation already exists for this item');
        }

        const negotiation = await this.negotiationModel.create({
            ...dto,
            senderId: new Types.ObjectId(user.id),
            status: 'ongoing',
            orderId: dto.orderId,
        });

        // Send initial message
        if (dto.offerPrice) {
            await this.sendMessage(
                { negotiationId: negotiation._id, receiverId: dto.receiverId, offerPrice: dto.offerPrice, orderId: dto.orderId, content: `Counter-offer: ${dto.offerPrice}` },
                user,
            );
        }

        // Send email notification
        const recipient = await this.userRepository.findOne(dto.receiverId);
        if (!recipient) throw new BadRequestException('Recipient not found');

        // Prepare details table
        const detailsTable = `
            <table width="100%" cellpadding="0" cellspacing="0"
                style="border-collapse: separate; border-spacing: 0 8px;">
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Counter Offer:</td>
                    <td style="padding:8px 0; color:#10b981; font-weight:600;">₦${dto.offerPrice?.toLocaleString() || ''}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Time:</td>
                    <td style="padding:8px 0; color:#666;">${new Date().toLocaleString()}</td>
                </tr>
            </table>
        `;

        // Prepare action notice block
        const actionNotice = `
            <div style="background:#f5f2ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
                <p style="font-size:16px; color:#444; margin:0;">
                    Please review the counter offer and respond through your chat interface. Quick response
                    helps ensure smooth transaction flow.
                </p>
            </div>
        `;

        // Read and prepare email template
        const generalHtml = fs.readFileSync(join(__dirname, '../../../templates/negotiation-created.html'), 'utf8')
            .replace(/{{PageTitle}}/g, 'New Price Negotiation')
            .replace(/{{StatusMessage}}/g, `${user.firstName} has initiated a price negotiation with a counter offer.`)
            .replace(/{{DetailsTitle}}/g, 'Negotiation Details')
            .replace(/{{DetailsTable}}/g, detailsTable)
            .replace(/{{ActionNotice}}/g, actionNotice)
            .replace(/{{Recipient}}/g, `${recipient.firstName} ${recipient.lastName}`)
            .replace(/{{NegotiationUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/chat/${negotiation._id}`);

        await this.resendService.sendMail({
            to: recipient.email,
            subject: 'New Price Negotiation',
            html: getHtmlWithFooter(generalHtml),
        });

        return negotiation;
    }



    async getAllNegotiations(query: NegotiationQueryDto): Promise<any[]> {
        const { profileId, type, status } = query;
        const match: any = { status: status || 'ongoing' };

        if (profileId) {
            // Ensure profileId is treated as ObjectId consistently
            const profileObjectId = Types.ObjectId.isValid(profileId) ? new Types.ObjectId(profileId) : profileId;
            match.$or = [
                { senderId: profileObjectId },
                { receiverId: profileObjectId },
            ];
        }
        if (type) {
            match.type = type;
        }

        const aggregations = await this.negotiationModel
            .aggregate([
                { $match: match },
                {
                    $lookup: {
                        from: 'users', // Collection name for User
                        localField: 'senderId',
                        foreignField: '_id',
                        as: 'senderId',
                    },
                },
                { $unwind: { path: '$senderId', preserveNullAndEmptyArrays: true } }, // Allow missing senderId
                {
                    $lookup: {
                        from: 'users',
                        localField: 'receiverId',
                        foreignField: '_id',
                        as: 'receiverId',
                    },
                },
                { $unwind: { path: '$receiverId', preserveNullAndEmptyArrays: true } }, // Allow missing receiverId
                {
                    $lookup: {
                        from: 'orders', // Collection name for Orders
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'orderId',
                    },
                },
                { $unwind: { path: '$orderId', preserveNullAndEmptyArrays: true } }, // Allow missing orderId
                {
                    $lookup: {
                        from: 'messages', // Collection name for Message
                        localField: '_id',
                        foreignField: 'negotiationId',
                        as: 'messages',
                    },
                },
                {
                    $addFields: {
                        lastMessage: {
                            $arrayElemAt: [
                                {
                                    $sortArray: {
                                        input: '$messages',
                                        sortBy: { createdAt: -1 }, // Sort by createdAt descending
                                    },
                                },
                                0,
                            ],
                        },
                        unreadCount: profileId
                            ? {
                                $size: {
                                    $filter: {
                                        input: '$messages',
                                        as: 'message',
                                        cond: {
                                            $and: [
                                                { $eq: ['$$message.receiverId', new Types.ObjectId(profileId)] },
                                                { $in: ['$$message.status', ['sent', 'delivered']] },
                                            ],
                                        },
                                    },
                                },
                            }
                            : 0, // Default to 0 if no profileId
                    },
                },
                {
                    $project: {
                        // messages: 0, // Exclude the full messages array
                        'lastMessage._id': 1,
                        'lastMessage.content': 1,
                        'lastMessage.offerPrice': 1,
                        'lastMessage.status': 1,
                        'lastMessage.senderId': 1,
                        'lastMessage.receiverId': 1,
                        'lastMessage.createdAt': 1,
                        'lastMessage.updatedAt': 1,
                        senderId: 1,
                        receiverId: 1,
                        orderId: 1,
                        type: 1,
                        status: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        unreadCount: 1,
                    },
                },
            ])
            .exec();

        return aggregations;
    }

    async getNegotiationDetail(id: string): Promise<any> {
        const negotiation = await this.negotiationModel
            .findById(id)
            .populate('senderId receiverId')
            .populate({
                path: 'orderId',
                populate: {
                    path: 'truckId',
                    populate: {
                        path: 'productId'
                    }
                }
            })
            .exec();
        if (!negotiation) {
            throw new BadRequestException('Negotiation not found');
        }
        const messages = await this.messageModel
            .find({ negotiationId: new Types.ObjectId(id) })
            .sort({ createdAt: 1 })
            .populate('userId receiverId')
            .exec();
        // Get lastMessage (latest by createdAt desc)
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        return { ...negotiation.toObject(), messages, lastMessage };
    }

    async updateNegotiationStatus(id: string, status: string, user: IJwtPayload): Promise<NegotiationDocument> {
        const negotiation = await this.negotiationModel.findById(id);
        if (!negotiation) {
            throw new BadRequestException('Negotiation not found');
        }
        if (negotiation.receiverId.toString() !== user.id && negotiation.senderId.toString() !== user.id) {
            throw new BadRequestException('Unauthorized to update negotiation');
        }
        negotiation.status = status;
        await negotiation.save();
        return negotiation;
    }

    async deleteNegotiation(id: string, user: IJwtPayload): Promise<void> {
        const negotiation = await this.negotiationModel.findById(id);
        if (!negotiation || (negotiation.senderId.toString() !== user.id && negotiation.receiverId.toString() !== user.id)) {
            throw new BadRequestException('Unauthorized to delete negotiation');
        }
        await this.negotiationModel.deleteOne({ _id: id });
    }

    async sendMessage(dto: MessageDto, user: IJwtPayload): Promise<MessageDocument> {
        const negotiation = await this.negotiationModel.findById(new Types.ObjectId(dto.negotiationId));
        if (!negotiation || negotiation.status !== 'ongoing') {
            throw new BadRequestException('Invalid or closed negotiation');
        }
        if (negotiation.senderId.toString() !== user.id && negotiation.receiverId.toString() !== user.id) {
            throw new BadRequestException('Unauthorized to send message');
        }

        const message = await this.messageModel.create({
            ...dto,
            userId: user.id,
            status: 'sent',
        });
        return message;
    }

    async createMessage(messageData: {
        userId: Types.ObjectId;
        receiverId: Types.ObjectId;
        negotiationId: Types.ObjectId;
        orderId: Types.ObjectId;
        content: string;
        offerPrice?: number;
        messageType?: 'user' | 'system';
        status?: 'sent' | 'delivered' | 'read';
    }): Promise<MessageDocument> {
        const message = await this.messageModel.create({
            ...messageData,
            status: messageData.status || 'sent',
            messageType: messageData.messageType || 'user'
        });
        return message;
    }

    async updateMessageStatus(messageId: string | Types.ObjectId, status: 'sent' | 'read' | 'delivered'): Promise<void> {
        const message = await this.messageModel.findById(messageId);
        if (!message) {
            throw new BadRequestException('Message not found');
        }
        message.status = status;
        await message.save();
    }

    async markMessageRead(messageId: string, user: IJwtPayload): Promise<any> {
        const message = await this.messageModel
            .findById(messageId)
            .populate('negotiationId')
            .exec();
        if (!message) {
            throw new BadRequestException('Message not found');
        }
        if (message.userId.toString() === user.id) {
            throw new BadRequestException('Cannot mark own message as read');
        }
        if (message.status === 'read') {
            return message;
        }
        message.status = 'read';
        await message.save();
        return message;
    }

    async getUnreadMessagesCount(negotiationId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<number> {
        return this.messageModel.countDocuments({
            negotiationId,
            userId: { $ne: userId },
            status: { $in: ['sent', 'delivered'] },
        });
    }

    async getMessage(messageId: string): Promise<any> {
        const message = await this.messageModel.findById(messageId).populate('negotiationId').exec();
        if (!message) {
            throw new BadRequestException('Message not found');
        }
        return message;
    }

    async getAllNegotiationsCount(query: NegotiationQueryDto): Promise<number> {
        const { profileId, type, status } = query;
        const match: any = { status: status || 'ongoing' };
        if (profileId) {
            match.$or = [
                { senderId: new Types.ObjectId(profileId) },
                { receiverId: new Types.ObjectId(profileId) }
            ];
        }
        if (type) {
            match.type = type;
        }
        return this.negotiationModel.countDocuments(match).exec();
    }


    async acceptNegotiation(id: string, user: any): Promise<NegotiationDocument> {
        const negotiation = await this.negotiationModel.findById(id) as NegotiationDocument;
        if (!negotiation) {
            throw new BadRequestException('Negotiation not found');
        }
        if (negotiation.receiverId.toString() !== user.id && negotiation.senderId.toString() !== user.id) {
            throw new BadRequestException('Unauthorized to accept negotiation');
        }
        negotiation.status = 'completed'; // Mark negotiation as completed
        await negotiation.save();

        // Cancel all other ongoing negotiations for the same truckId (if type is truck)
        // let truckId = (negotiation as any).truckId;
        let truckId = null;
        if (negotiation.type === 'truck' && !truckId && negotiation.orderId) {
            // Fetch the order to get truckId
            const order = await this.negotiationModel.db.model('Order').findById(negotiation.orderId);
            if (order && order.truckId) {
                truckId = order.truckId;
            }
        }
        if (negotiation.type === 'truck' && truckId) {
            // Find all other ongoing negotiations for this truck
            const cancelledNegotiations = await this.negotiationModel.find({
                truckId: truckId,
                _id: { $ne: negotiation._id },
                status: 'ongoing',
            });
            // Cancel them
            await this.negotiationModel.updateMany(
                {
                    truckId: truckId,
                    _id: { $ne: negotiation._id },
                    status: 'ongoing',
                },
                { $set: { status: 'cancelled' } }
            );
            // Notify all affected buyers
            for (const cancelled of cancelledNegotiations) {
                // Find the buyer (senderId if their role is buyer)
                const buyer = await this.userRepository.findOne(cancelled.senderId);
                if (buyer && buyer.email) {
                    const generalHtml = fs.readFileSync(join(__dirname, '../../../templates/negotiation-update.html'), 'utf8')
                        .replace(/{{Sender}}/g, 'System')
                        .replace(/{{Recipient}}/g, `${buyer.firstName} ${buyer.lastName}`)
                        .replace(/{{UpdateTitle}}/g, 'Negotiation Automatically Cancelled')
                        .replace(/{{StatusMessage}}/g, 'Another offer for this order has been accepted, and this negotiation has been automatically cancelled.')
                        .replace(/{{DetailsTitle}}/g, 'Cancelled Negotiation Details')
                        .replace(/{{DetailsRows}}/g, `
                            <tr>
                                <td style="padding:8px 0; color:#444; font-weight:600;">Order ID:</td>
                                <td style="padding:8px 0; color:#666;">${cancelled.orderId.toString()}</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 0; color:#444; font-weight:600;">Status:</td>
                                <td style="padding:8px 0; color:#666;">Cancelled (Another Offer Accepted)</td>
                            </tr>
                        `)
                        .replace(/{{Time}}/g, new Date().toLocaleString())
                        .replace(/{{ActionNotice}}/g, `
                            <div style="background:#f5f2ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
                                <p style="font-size:16px; color:#444; margin:0;">
                                    This negotiation has been automatically cancelled as another offer has been accepted. No further action is required.
                                </p>
                            </div>
                        `)
                        .replace(/{{NegotiationUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/chat/${cancelled._id}`);

                    await this.resendService.sendMail({
                        to: buyer.email,
                        subject: 'Negotiation Cancelled - Another Offer Accepted',
                        html: getHtmlWithFooter(generalHtml),
                    });
                }
            }
        }

        // Fetch recipient for email
        const recipient = await this.userRepository.findOne(
            negotiation.senderId.toString() === user.id ? negotiation.receiverId : negotiation.senderId,
        );
        if (!recipient) throw new BadRequestException('Recipient not found');

        // Send email notification
        const generalHtml = fs.readFileSync(join(__dirname, '../../../templates/negotiation-update.html'), 'utf8')
            .replace(/{{Sender}}/g, user.firstName)
            .replace(/{{Recipient}}/g, `${recipient.firstName} ${recipient.lastName}`)
            .replace(/{{UpdateTitle}}/g, 'Negotiation Accepted')
            .replace(/{{StatusMessage}}/g, `${user.firstName} has accepted the negotiation. You can now proceed with the order process.`)
            .replace(/{{DetailsTitle}}/g, 'Accepted Negotiation Details')
            .replace(/{{DetailsRows}}/g, `
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Status:</td>
                    <td style="padding:8px 0; color:#666;">Accepted</td>
                </tr>
            `)
            .replace(/{{Time}}/g, new Date().toLocaleString())
            .replace(/{{ActionNotice}}/g, `
                <div style="background:#f5f2ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
                    <p style="font-size:16px; color:#444; margin:0;">
                        The negotiation has been successfully concluded. You can proceed with the order process.
                    </p>
                </div>
            `)
            .replace(/{{NegotiationUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/chat/${negotiation._id}`);

        await this.resendService.sendMail({
            to: recipient.email,
            subject: 'Negotiation Accepted',
            html: getHtmlWithFooter(generalHtml),
        });

        return negotiation;
    }

    async rejectNegotiation(id: string, offerPrice: number, user: any): Promise<MessageDocument> {
        const negotiation = await this.negotiationModel.findById(id);
        if (!negotiation || negotiation.status !== 'ongoing') {
            throw new BadRequestException('Invalid or closed negotiation');
        }
        if (negotiation.receiverId.toString() !== user._id && negotiation.senderId.toString() !== user._id) {
            throw new BadRequestException('Unauthorized to reject negotiation');
        }

        let message = await this.messageModel.create({
            negotiationId: new Types.ObjectId(id),
            userId: new Types.ObjectId(user._id),
            receiverId: negotiation.senderId.toString() === user._id ? negotiation.receiverId : negotiation.senderId,
            orderId: negotiation.orderId,
            content: `Counter-offer: ${offerPrice}`,
            status: 'sent',
            offerPrice,
        });
        // Populate userId before returning
        message = await this.messageModel.findById(message._id).populate('userId').exec();

        // Keep negotiation status as 'ongoing' for counter-offers
        // (No need to set negotiation.status = 'rejected')

        // Fetch recipient for email
        const recipient = await this.userRepository.findOne(message.receiverId);
        if (!recipient) throw new BadRequestException('Recipient not found');

        // Send email notification
        const generalHtml = fs.readFileSync(join(__dirname, '../../../templates/negotiation-update.html'), 'utf8')
            .replace(/{{Sender}}/g, user.firstName)
            .replace(/{{Recipient}}/g, `${recipient.firstName} ${recipient.lastName}`)
            .replace(/{{DetailsTitle}}/g, 'Counter Offer Details')
            .replace(/{{DetailsRows}}/g, `
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Counter Offer:</td>
                    <td style="padding:8px 0; color:#10b981; font-weight:600;">₦${offerPrice.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Status:</td>
                    <td style="padding:8px 0; color:#666;">Counter Offer Received</td>
                </tr>
            `)
            .replace(/{{Time}}/g, new Date().toLocaleString())
            .replace(/{{ActionNotice}}/g, `
                <div style="background:#f5f2ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
                    <p style="font-size:16px; color:#444; margin:0;">
                        Please review the counter offer and respond through your chat interface.
                    </p>
                </div>
            `)
            .replace(/{{NegotiationUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/chat/${negotiation._id}`);

        await this.resendService.sendMail({
            to: recipient.email,
            subject: 'New Counter Offer',
            html: getHtmlWithFooter(generalHtml),
        });

        return message;
    }

    async cancelNegotiation(id: string, user: any): Promise<NegotiationDocument> {
        const negotiation = await this.negotiationModel.findById(id);
        if (!negotiation || negotiation.status !== 'ongoing') {
            throw new BadRequestException('Invalid or closed negotiation');
        }
        if (negotiation.senderId.toString() !== user._id && negotiation.receiverId.toString() !== user._id) {
            throw new BadRequestException('Unauthorized to cancel negotiation');
        }
        negotiation.status = 'cancelled';
        await negotiation.save();

        // Fetch recipient for email
        const recipient = await this.userRepository.findOne(
            negotiation.senderId.toString() === user._id ? negotiation.receiverId : negotiation.senderId,
        );
        if (!recipient) throw new BadRequestException('Recipient not found');

        // Send email notification
        const generalHtml = fs.readFileSync(join(__dirname, '../../../templates/negotiation-update.html'), 'utf8')
            .replace(/{{Sender}}/g, user.firstName)
            .replace(/{{Recipient}}/g, `${recipient.firstName} ${recipient.lastName}`)
            .replace(/{{UpdateTitle}}/g, 'Negotiation Cancelled')
            .replace(/{{StatusMessage}}/g, `${user.firstName} has cancelled the negotiation. The order process has been stopped.`)
            .replace(/{{DetailsTitle}}/g, 'Cancelled Negotiation Details')
            .replace(/{{DetailsRows}}/g, `
                <tr>
                    <td style="padding:8px 0; color:#444; font-weight:600;">Status:</td>
                    <td style="padding:8px 0; color:#666;">Cancelled</td>
                </tr>
            `)
            .replace(/{{Time}}/g, new Date().toLocaleString())
            .replace(/{{ActionNotice}}/g, `
                <div style="background:#f5f2ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
                    <p style="font-size:16px; color:#444; margin:0;">
                        This negotiation has been cancelled. No further action is required.
                    </p>
                </div>
            `)
            .replace(/{{NegotiationUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/chat/${negotiation._id}`);

        await this.resendService.sendMail({
            to: recipient.email,
            subject: 'Negotiation Cancelled',
            html: getHtmlWithFooter(generalHtml),
        });

        return negotiation;
    }

    async fetchLastMessage(negotiationId: string): Promise<MessageDocument | null> {
        const negotiationObjectId = new Types.ObjectId(negotiationId);
        // console.log(negotiationId, negotiationObjectId);
        const lastMessage = await this.messageModel
            .findOne({ negotiationId: negotiationObjectId })
            .sort({ createdAt: -1 })
            .exec();
        return lastMessage || null;
    }

    async createSystemMessage(payload: {
        negotiationId: string;
        content: string;
        orderId: string;
        messageType: 'system';
    }): Promise<any> {
        const negotiation = await this.negotiationModel.findById(payload.negotiationId);
        if (!negotiation) {
            throw new BadRequestException('Negotiation not found');
        }

        const message = await this.messageModel.create({
            negotiationId: payload.negotiationId,
            userId: payload.negotiationId, // System messages have no userId
            receiverId: payload.negotiationId, // System messages are broadcast to all
            orderId: payload.orderId,
            content: payload.content,
            status: 'sent',
            messageType: 'system',
        });

        return message;
    }
}