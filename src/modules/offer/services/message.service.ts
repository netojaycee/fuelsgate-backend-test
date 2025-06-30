import { MessageGateway } from '../gateway/message.gateway';
import { MessageDto, MessageQueryDto } from '../dto/message.dto';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { OfferRepository } from '../repositories/offer.repository';
import { MessageRepository } from '../repositories/message.repository';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'path';
import { MailerService } from '@nestjs-modules/mailer';
import { formatNumber } from 'src/utils/helpers';

@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly userRepository: UserRepository,
    private readonly offerRepository: OfferRepository,
    @Inject(forwardRef(() => MessageGateway))
    private readonly messageGateway: MessageGateway,
    private readonly mailService: MailerService,
  ) {}

  async sendMessage(messageBody: MessageDto, user: IJwtPayload) {
    const [sender, offer] = await Promise.all([
      this.userRepository.findOne(user.id),
      this.offerRepository.findOne(messageBody.offerId),
    ]);

    if (!sender) throw new BadRequestException('Sender ID is invalid');
    if (!offer) throw new BadRequestException('Offer ID is invalid');

    messageBody.userId = sender._id;
    messageBody.offerId = offer._id;

    const message = await this.messageRepository.create(messageBody);
    this.messageGateway.broadcastMessage(message, user);

    const productName = (
      offer.productUploadId as any
    )?.productId?.value.toUpperCase();

    const productMeasurementUnit = (offer.productUploadId as any)?.productId
      ?.unit;

    let subject = '';
    let recipientEmail = '';
    let recipientName = '';

    const senderName = `${sender.firstName} ${sender.lastName}`;
    if (user.role === 'seller') {
      subject = `${senderName} made a counter offer for ${productName}`;
    } else {
      subject = `${senderName} made a new offer for ${productName}`;
    }

    if (user.id === offer.senderId._id.toString()) {
      recipientEmail = `${(offer.receiverId as any)?.email}`;
      recipientName = `${(offer.receiverId as any)?.firstName} ${(offer.receiverId as any)?.lastName}`;
    } else {
      recipientEmail = `${(offer.senderId as any)?.email}`;
      recipientName = `${(offer.senderId as any)?.firstName} ${(offer.senderId as any)?.lastName}`;
    }

    this.mailService.sendMail({
      to: recipientEmail,
      subject,
      template: join(__dirname, '../mails/new-offer'),
      context: {
        Sender: senderName,
        Recipient: recipientName,
        ProductName: productName,
        Volume: `${formatNumber(offer.volume)} ${productMeasurementUnit}`,
        OfferPrice: formatNumber(message?.offer),
        OfferUrl: `${process.env.FRONTEND_URL}/dashboard/chat/${offer._id}`,
        OfferTime: new Date().toLocaleString(),
      },
    });

    return message;
  }

  async getAllMessages(query: MessageQueryDto, offerId: string) {
    const { page = 1, limit = 10, search } = query;
    const offset = (page - 1) * limit;
    const offer = await this.offerRepository.findOne(offerId);
    if (!offer) throw new BadRequestException('Offer ID is invalid');

    const searchFilter: any = {
      $and: [{ offerId: offer._id }],
      $or: [],
    };

    if (search) searchFilter.$or.push({ offer: search });
    if (!searchFilter.$or.length) delete searchFilter.$or;

    const messages = await this.messageRepository.findAll(
      searchFilter,
      offset,
      limit,
    );
    const total = await this.messageRepository.getTotal(searchFilter);

    return {
      offer,
      messages,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMessageDetail(messageId: string) {
    const message = await this.messageRepository.findOne(messageId);

    if (!message) {
      throw new NotFoundException({
        message: 'Message not found',
        statusCode: 404,
      });
    }

    return message;
  }

  async updateMessageDetail(
    messageId: string,
    messageBody: MessageDto,
    user: IJwtPayload,
  ) {
    const sender = await this.userRepository.findOne(user.id);
    messageBody.actionBy = sender._id;
    const message = await this.messageRepository.update(messageId, messageBody);
    this.messageGateway.broadcastMessage(message, user);

    const offer = await this.offerRepository.findOne(message?.offerId);

    const productName = (
      offer.productUploadId as any
    )?.productId?.value.toUpperCase();

    let recipientEmail = '';
    let recipientName = '';

    const senderName = `${sender.firstName} ${sender.lastName}`;
    const subject = `Offer ${messageBody.status.charAt(0).toUpperCase() + messageBody.status.slice(1)}`;

    if (user.id === offer.senderId._id.toString()) {
      recipientEmail = `${(offer.receiverId as any)?.email}`;
      recipientName = `${(offer.receiverId as any)?.firstName} ${(offer.receiverId as any)?.lastName}`;
    } else {
      recipientEmail = `${(offer.senderId as any)?.email}`;
      recipientName = `${(offer.senderId as any)?.firstName} ${(offer.senderId as any)?.lastName}`;
    }

    this.mailService.sendMail({
      to: recipientEmail,
      subject,
      template: join(__dirname, '../mails/offer-status'),
      context: {
        Sender: senderName,
        Recipient: recipientName,
        ProductName: productName,
        Status: messageBody.status,
        OfferUrl:
          user.role === 'seller'
            ? `${process.env.FRONTEND_URL}/dashboard/chat/${offer._id}`
            : '',
      },
    });
    return message;
  }

  async delete(messageId: string) {
    const message = await this.messageRepository.delete(messageId);
    if (!message) {
      throw new NotFoundException({
        message: 'Message not found',
        statusCode: 404,
      });
    }
    return true;
  }
}
