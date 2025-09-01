import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../entities/order.entity';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { TruckService } from 'src/modules/truck/services/truck.service';
import { TicketService } from 'src/modules/ticket/services/ticket.service';
import { ResendService } from 'src/modules/resend/resend.service';
import { PlatformConfigService } from 'src/modules/platform-config/services/platform-config.service';
import { TruckRepository } from 'src/modules/truck/repositories/truck.repository';
import { join } from 'path';
import * as fs from 'fs';
import { getHtmlWithFooter } from 'src/utils/helpers';
import { generateOrderId } from 'src/utils/helpers';
import { BuyerRepository } from 'src/modules/buyer/repositories/buyer.repository';
import { SellerRepository } from 'src/modules/seller/repositories/seller.repository';
import { TransporterRepository } from 'src/modules/transporter/repositories/transporter.repository';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { ProductUploadRepository } from 'src/modules/product-upload/repositories/product-upload.repository';
import { OrderDtoSchema } from '../validations/order.validation';
import { Server } from 'socket.io';
import { SOCKET_EVENTS } from 'src/utils/SocketEvents';
import { OrderRepository } from '../repositories/order.repository';
import { OrderGateway } from '../gateway/order.gateway';
import { NegotiationService } from 'src/modules/negotiation/services/negotiation.service';
import { OrderDto, OrderQueryDto, OrderUpdateDto } from '../dto/order.dto';
import { NegotiationDocument } from 'src/modules/negotiation/entities/negotiation.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly resendService: ResendService,
    private readonly truckService: TruckService,
    private readonly ticketService: TicketService,
    private readonly negotiationService: NegotiationService,
    private readonly platformConfigService: PlatformConfigService,
    private truckRepository: TruckRepository,
    private buyerRepository: BuyerRepository,
    private sellerRepository: SellerRepository,
    private transporterRepository: TransporterRepository,
    private userRepository: UserRepository,
    private productUploadRepository: ProductUploadRepository,
    private orderRepository: OrderRepository,
    private orderGateway: OrderGateway,
    @Inject('SOCKET_SERVER') private readonly socketServer: Server,


  ) { }

  async createOrder(dto: OrderDto, user: IJwtPayload): Promise<OrderDocument> {

    console.log('Creating order:', dto, user);
    // Validate DTO
    try {
      await OrderDtoSchema.validate(dto, { abortEarly: false });
    } catch (error) {
      throw new BadRequestException(error.errors);
    }

    // Restrict to buyers
    if (user.role !== 'buyer') {
      throw new BadRequestException('Only buyers can create order');
    }

    const buyer = await this.buyerRepository.findOneQuery({ userId: user.id });
    if (!buyer) throw new BadRequestException('Buyer ID is invalid');


    // Check for existing order
    if (dto.type === 'truck') {
      const existing = await this.orderModel.findOne({
        buyerId: buyer._id,
        truckId: dto.truckId,
        type: 'truck',
        status: { $nin: ['completed', 'cancelled'] },
      });

      console.log(existing, "existing")
      if (existing) {
        throw new BadRequestException('An ongoing or pending RFQ already exists for this truck');
      }
    } else if (dto.type === 'product') {
      const existing = await this.orderModel.findOne({
        buyerId: buyer._id,
        productUploadId: dto.productUploadId,
        type: 'product',
        status: { $ne: 'completed' },
      });
      if (existing) {
        throw new BadRequestException('An ongoing or pending order already exists for this product');
      }
    }

    // Generate tracking ID
    const trackingId = generateOrderId(dto.type === 'truck' ? 'FG-TORD' : 'FG-ORD');



    // Fetch entities
    let entity: any;
    let profile: any;
    let profileType: string;

    if (dto.type === 'truck') {
      entity = await this.truckRepository.findOne(dto.truckId);
      if (!entity) throw new BadRequestException('Truck ID is invalid');
      profileType = entity.profileType.toLowerCase();
      profile =
        profileType === 'seller'
          ? await this.sellerRepository.findOne(entity.profileId)
          : await this.transporterRepository.findOne(entity.profileId);
    } else {
      entity = await this.productUploadRepository.findOne(dto.productUploadId);
      if (!entity) throw new BadRequestException('Product Upload ID is invalid');
      profile = await this.sellerRepository.findOne(dto.profileId);
      profileType = 'seller';
    }

    if (!profile) throw new BadRequestException('Profile ID is invalid');

    // Create order
    const order = await this.orderModel.create({
      ...dto,
      trackingId,
      status: 'pending',
      rfqStatus: dto.type === 'truck' ? 'pending' : undefined,
      buyerId: buyer._id,
      profileId: profile._id,
      profileType,
    });

    const [recipient, sender] = await Promise.all([
      this.userRepository.findOne(profile.userId),
      this.userRepository.findOne(buyer.userId),
    ]);

    if (!recipient) throw new BadRequestException('Recipient ID is invalid');
    if (!sender) throw new BadRequestException('Sender ID is invalid');

    // Send email notification
    const recipientName = `${recipient.firstName} ${recipient.lastName}`;
    const senderName = `${sender.firstName} ${sender.lastName}`;
    const subject = dto.type === 'truck' ? 'New Truck Order Alert!' : 'New Product Order Alert!';

    // Read and prepare email template
    let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/new-order.html'), 'utf8');

    // Prepare type-specific content
    const isTruck = dto.type === 'truck';

    // Prepare order details rows based on type
    let orderDetailsRows = '';
    if (isTruck) {
      orderDetailsRows = `
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Number:</td>
            <td style="padding:8px 0; color:#666;">${entity.truckNumber}</td>
        </tr>
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600;">Loading Depot:</td>
            <td style="padding:8px 0; color:#666;">${order.loadingDepot}</td>
        </tr>
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600;">Destination:</td>
            <td style="padding:8px 0; color:#666;">${order.destination}</td>
        </tr>
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600;">State:</td>
            <td style="padding:8px 0; color:#666;">${order.state}</td>
        </tr>
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600;">City:</td>
            <td style="padding:8px 0; color:#666;">${order.city}</td>
        </tr>
      `;
    } else {
      orderDetailsRows = `
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Product:</td>
            <td style="padding:8px 0; color:#666;">${entity.name}</td>
        </tr>
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600;">Volume:</td>
            <td style="padding:8px 0; color:#666;">${String(order.volume)}</td>
        </tr>
      `;
    }

    generalHtml = generalHtml
      .replace(/{{OrderTitle}}/g, isTruck ? 'New Truck Request for Quotation (RFQ)' : 'New Product Order Request')
      .replace(/{{OrderType}}/g, isTruck ? 'truck RFQ' : 'product order')
      .replace(/{{OrderDetailsTitle}}/g, isTruck ? 'RFQ Details' : 'Order Details')
      .replace(/{{OrderDetailsRows}}/g, orderDetailsRows)
      .replace(/{{ActionMessage}}/g, isTruck
        ? 'Please review this RFQ and provide your quotation through the dashboard. The buyer is waiting for your response.'
        : 'Please review this order and take appropriate action through your dashboard. Quick response ensures smooth transaction flow.')
      .replace(/{{ActionButtonText}}/g, isTruck ? 'View RFQ Details' : 'View Order Details')
      .replace(/{{OrderTypePlural}}/g, isTruck ? 'RFQs' : 'orders')
      .replace(/{{Sender}}/g, senderName)
      .replace(/{{Recipient}}/g, recipientName)
      .replace(/{{OrderUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/${isTruck ? 'my-rfq' : 'my-order'}/${order._id}`)
      .replace(/{{OrderTime}}/g, new Date().toLocaleString());



    await this.resendService.sendMail({
      to: recipient.email,
      subject,
      html: getHtmlWithFooter(generalHtml),
    });

    // Use new notification system
    await this.orderGateway.handleNewOrder(profile.userId, order._id, dto.type);

    return order;
  };

  async updateOrder(orderId: string, dto: OrderUpdateDto, user: IJwtPayload): Promise<OrderDocument | NegotiationDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    console.log(dto, "dto")
    if (order.type !== dto.type) {
      throw new BadRequestException(`Order type mismatch: expected ${order.type}, got ${dto.type}`);
    }

    let entity: any;
    let profile: any;
    // let recipient: any;
    // let sender: any;
    let profileType: string;
    let emailContext: any = {};
    // let emailSubject: string;

    // Fetch common entities

    // console.log('dto:', dto, 'order:', order, 'user:', user);
    const buyer = await this.buyerRepository.findOne(order.buyerId);
    if (!buyer) throw new BadRequestException('Buyer not found');

    if (dto.type === 'truck') {
      entity = await this.truckRepository.findOne(order.truckId);
      if (!entity) throw new BadRequestException('Truck not found');
      profileType = entity.profileType.toLowerCase();
      profile =
        profileType === 'seller'
          ? await this.sellerRepository.findOne(entity.profileId)
          : await this.transporterRepository.findOne(entity.profileId);
    } else {
      entity = await this.productUploadRepository.findOne(order.productUploadId);
      if (!entity) throw new BadRequestException('Product not found');
      profile = await this.sellerRepository.findOne(order.profileId);
      profileType = 'seller';
    }
    if (!profile) throw new BadRequestException('Profile not found');

    const [recipient, sender] = await Promise.all([
      this.userRepository.findOne(dto.type === 'truck' && dto.description === 'sending_rfq' ? buyer.userId : profile.userId),
      this.userRepository.findOne(user.id),
    ]);
    if (!recipient) throw new BadRequestException('Recipient not found');
    if (!sender) throw new BadRequestException('Sender not found');

    emailContext = {
      Sender: `${sender.firstName} ${sender.lastName}`,
      Recipient: `${recipient.firstName} ${recipient.lastName}`,
      LoadingDepot: dto.type === 'truck' ? order.loadingDepot : undefined,
      Destination: dto.type === 'truck' ? order.destination : undefined,
      State: dto.type === 'truck' ? order.state : undefined,
      City: dto.type === 'truck' ? order.city : undefined,
      TruckId: dto.type === 'truck' ? entity.truckNumber : undefined,
      ProductName: dto.type === 'product' ? entity.name : undefined,
      Volume: dto.type === 'product' ? order.volume : undefined,
      Price: dto.price,
      ArrivalTime: dto.arrivalTime,
      Status: dto.status || order.status,
      type: dto.type,
      description: dto.description,
      OrderUrl: `${process.env.FRONTEND_URL}/dashboard/${dto.type === 'truck' ? 'my-rfq' : 'my-order'}/${order._id}`,
      UpdateTime: new Date().toLocaleString(),
    };
    const emailSubject = `Order Update: ${dto.description === 'sending_rfq'
      ? 'RFQ Sent'
      : dto.description === 'accepting_order'
        ? 'Order Accepted'
        : dto.description === 'rejecting_order'
          ? 'Order Rejected'
          : dto.description === 'order_to_in_progress'
            ? 'Order In Progress'
            : 'Order Completed'
      }`;

    // Variable to track if negotiation was created during order rejection
    let negotiationCreated: NegotiationDocument | null = null;

    switch (dto.description) {
      case 'sending_rfq':
        if (dto.type !== 'truck') {
          throw new BadRequestException('RFQ updates are only for truck order');
        }
        if (user.id !== profile.userId.toString()) {
          // console.log(user.id, profile.userId, "ghghg")
          throw new BadRequestException('Only the truck owner can send an RFQ');
        }
        if (order.rfqStatus !== 'pending') {
          throw new BadRequestException('RFQ already sent or processed');
        }
        order.price = dto.price;
        order.arrivalTime = dto.arrivalTime;
        order.rfqStatus = 'sent';
        break;

      case 'accepting_order':
        if (dto.type === 'truck' && dto.rfqStatus !== 'accepted') {
          throw new BadRequestException('RFQ must be accepted for truck order');
        }
        // if (user.id !== profile.userId.toString()) {
        //     throw new BadRequestException('Only the seller/transporter can accept the order');
        // }
        order.status = dto.status || 'in-progress';
        if (dto.type === 'truck' && dto.rfqStatus === 'accepted') {
          order.rfqStatus = 'accepted';
          await this.truckRepository.update(order.truckId, { status: 'locked' });
          await this.notifyOtherBuyers(order, user);
          const serviceFees = await this.platformConfigService.getServiceFees();
          const transporterFeeRate = Number(serviceFees.transporterServiceFee);
          const buyerFeeRate = Number(serviceFees.traderServiceFee);
          const transportFee = Number(order.price);


          if (
            isNaN(transporterFeeRate) ||
            isNaN(buyerFeeRate) ||
            isNaN(transportFee)
          ) {
            throw new BadRequestException('Invalid fee rates or offer price for ticket creation');
          }

          // Ensure only one ticket per order
          // const existingTicket = await this.ticketService.findByOrderId(order._id.toString());
          // if (!existingTicket) {
          await this.ticketService.create({
            orderId: order._id.toString(),
            transportFee,
            transporterServiceFee: Number(((transporterFeeRate / 100) * transportFee).toFixed(2)),
            buyerServiceFee: Number(((buyerFeeRate / 100) * transportFee).toFixed(2)),
          });
          // }
        }
        break;

      case 'rejecting_order':
        if (user.id !== String(profile.userId) && user.id !== String(buyer.userId)) {
          throw new BadRequestException('Only the buyer or seller/transporter can reject the order');
        }
        // order.status = 'cancelled';
        order.rfqStatus = dto.type === 'truck' ? 'rejected' : undefined;

        if (user.id === String(buyer.userId) && dto.offerPrice) {
          negotiationCreated = await this.negotiationService.createNegotiation({
            receiverId: profile.userId,
            type: dto.type,
            // productUploadId: dto.type === 'product' ? order.productUploadId : undefined,
            // truckId: dto.type === 'truck' ? order.truckId : undefined,
            orderId: order._id,
            offerPrice: dto.offerPrice,
            // volume: dto.type === 'product' ? order.volume : undefined,
          }, user);
          // Add negotiation id to order before saving
          await order.save();
          // const roomId = [user.id, profile.userId].sort().join(':');
          const roomId = negotiationCreated._id.toString();
          console.log(negotiationCreated, "negotiation")
          this.socketServer.to(roomId).emit(SOCKET_EVENTS.RECEIVE_NEGOTIATION, negotiationCreated);

          // We'll send the chat notification through the new notification system below
        }
        break;

      case 'order_to_in_progress':
        if (user.id !== profile.userId.toString()) {
          throw new BadRequestException('Only the seller/transporter can update order to in progress');
        }
        order.status = 'in-progress';
        break;

      case 'order_to_completed':
        if (user.id !== profile.userId.toString()) {
          throw new BadRequestException('Only the seller/transporter can mark order as completed');
        }
        order.status = 'completed';
        // if (dto.type === 'truck') {
        //     await this.truckRepository.update(order.truckId, { status: 'available' });
        // }
        break;

      default:
        throw new BadRequestException('Invalid description');
    }

    await order.save();

    // Send email
    let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/order-update.html'), 'utf8');

    // Prepare dynamic title and message based on description
    let updateTitle = '';
    let statusMessage = '';
    switch (dto.description) {
      case 'sending_rfq':
        updateTitle = 'New Price Quotation Received';
        statusMessage = `${emailContext.Sender} has sent a price quotation for your ${emailContext.type} order request.`;
        break;
      case 'accepting_order':
        updateTitle = 'Order Accepted - Next Steps';
        statusMessage = `Great news! ${emailContext.Sender} has accepted your ${emailContext.type} order.`;
        break;
      case 'rejecting_order':
        updateTitle = 'Order Update - Price Negotiation';
        statusMessage = `${emailContext.Sender} has proposed a new price for your ${emailContext.type} order.`;
        break;
      case 'order_to_in_progress':
        updateTitle = 'Order Now In Progress';
        statusMessage = `Your ${emailContext.type} order is now being processed.`;
        break;
      case 'order_to_completed':
        updateTitle = 'Order Successfully Completed';
        statusMessage = `Your ${emailContext.type} order has been successfully completed.`;
        break;
    }

    // Prepare order details rows based on type
    const orderDetailsRows = dto.type === 'truck' ?
      `<tr>
          <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Number:</td>
          <td style="padding:8px 0; color:#666;">${emailContext.TruckId}</td>
      </tr>
      <tr>
          <td style="padding:8px 0; color:#444; font-weight:600;">Loading Depot:</td>
          <td style="padding:8px 0; color:#666;">${emailContext.LoadingDepot}</td>
      </tr>
      <tr>
          <td style="padding:8px 0; color:#444; font-weight:600;">Destination:</td>
          <td style="padding:8px 0; color:#666;">${emailContext.Destination}</td>
      </tr>
      <tr>
          <td style="padding:8px 0; color:#444; font-weight:600;">State:</td>
          <td style="padding:8px 0; color:#666;">${emailContext.State}</td>
      </tr>
      <tr>
          <td style="padding:8px 0; color:#444; font-weight:600;">City:</td>
          <td style="padding:8px 0; color:#666;">${emailContext.City}</td>
      </tr>` :
      `<tr>
          <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Product:</td>
          <td style="padding:8px 0; color:#666;">${emailContext.ProductName}</td>
      </tr>
      <tr>
          <td style="padding:8px 0; color:#444; font-weight:600;">Volume:</td>
          <td style="padding:8px 0; color:#666;">${emailContext.Volume}</td>
      </tr>`;

    // Prepare additional details rows (price and arrival time)
    let additionalDetailsRows = '';
    if (dto.description === 'sending_rfq' || dto.description === 'rejecting_order') {
      additionalDetailsRows += `
      <tr>
          <td style="padding:8px 0; color:#444; font-weight:600;">Price:</td>
          <td style="padding:8px 0; color:#10b981; font-weight:600;">₦${emailContext.Price}</td>
      </tr>`;
    }
    if (dto.description === 'sending_rfq') {
      additionalDetailsRows += `
      <tr>
          <td style="padding:8px 0; color:#444; font-weight:600;">Expected Arrival:</td>
          <td style="padding:8px 0; color:#666;">${emailContext.ArrivalTime}</td>
      </tr>`;
    }

    // Prepare status-specific notice block
    let statusNoticeBlock = '';
    switch (dto.description) {
      case 'sending_rfq':
        statusNoticeBlock = `
        <div style="background:#f5f2ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
          <p style="font-size:16px; color:#444; margin:0;">
            Please review the quotation and respond through your dashboard. Quick response ensures
            smooth transaction flow.
          </p>
        </div>`;
        break;
      case 'accepting_order':
        statusNoticeBlock = `
        <div style="background:#ecfdf5; border-radius:8px; padding:20px; margin:0 0 24px 0;">
          <p style="font-size:16px; color:#065f46; margin:0;">
            🎉 Your order has been confirmed. You can track its progress through your dashboard.
          </p>
        </div>`;
        break;
      case 'rejecting_order':
        statusNoticeBlock = `
        <div style="background:#fff7ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
          <p style="font-size:16px; color:#9a3412; margin:0;">
            A new price has been proposed. Please review the details and respond through your
            dashboard.
          </p>
        </div>`;
        break;
      case 'order_to_completed':
        statusNoticeBlock = `
        <div style="background:#ecfdf5; border-radius:8px; padding:20px; margin:0 0 24px 0;">
          <p style="font-size:16px; color:#065f46; margin:0;">
            ✨ Thank you for using Fuelsgate! Your order has been successfully completed.
          </p>
        </div>`;
        break;
    }

    // Replace all variables in template
    generalHtml = generalHtml
      .replace(/{{UpdateTitle}}/g, updateTitle)
      .replace(/{{StatusMessage}}/g, statusMessage)
      .replace(/{{OrderDetailsRows}}/g, orderDetailsRows)
      .replace(/{{AdditionalDetailsRows}}/g, additionalDetailsRows)
      .replace(/{{StatusNoticeBlock}}/g, statusNoticeBlock)
      .replace(/{{Sender}}/g, emailContext.Sender)
      .replace(/{{Recipient}}/g, emailContext.Recipient)
      .replace(/{{OrderUrl}}/g, emailContext.OrderUrl)
      .replace(/{{Status}}/g, emailContext.Status)
      .replace(/{{UpdateTime}}/g, new Date().toLocaleString());

    await this.resendService.sendMail({
      to: recipient.email,
      subject: emailSubject,
      html: getHtmlWithFooter(generalHtml),

    });


    // Use new notification system for order updates with description context
    await this.orderGateway.handleOrderUpdate(
      recipient._id,
      order._id,
      dto.type,
      dto.description,
      {
        status: order.status,
        rfqStatus: order.rfqStatus,
        price: order.price,
        negotiationId: negotiationCreated?._id
      }
    );

    // If a negotiation was created during rejection, return the negotiation instead of the order
    return negotiationCreated || order;
  }

  async getAllOrder(query: OrderQueryDto, user: IJwtPayload): Promise<any> {
    const {
      buyerId,
      profileId,
      type,
      status,
      page = 1,
      limit = 10,
      trackingId,
      truckId,
      profileType,
      orderId
    } = query as any;

    console.log('Fetching order with query:', query);
    const match: any = { status: status || { $ne: 'cancelled' } };

    // Basic filters that apply to all users
    if (buyerId) match.buyerId = buyerId;
    if (profileId) match.profileId = new Types.ObjectId(profileId);
    if (type) match.type = type;

    // Admin-specific enhanced filtering capabilities
    if (user.role === 'admin') {
      console.log('Admin fetching all orders with enhanced filters');

      // Additional admin filters
      if (trackingId) {
        match.trackingId = { $regex: trackingId, $options: 'i' };
      }
      if (truckId) {
        match.truckId = { $regex: truckId, $options: 'i' };
      }
      if (profileType) {
        match.profileType = profileType;
      }
      if (orderId) {
        match._id = new Types.ObjectId(orderId);
      }

      // Validate profile combinations for admin
      if (profileId && profileType) {
        let profile: any;
        if (profileType === 'seller') {
          profile = await this.sellerRepository.findOne(profileId);
        } else if (profileType === 'transporter') {
          profile = await this.transporterRepository.findOne(profileId);
        }
        if (profileId && !profile) {
          throw new BadRequestException('Profile ID is invalid for the specified profile type');
        }
      }

      // Validate buyer for admin
      if (buyerId) {
        const buyer = await this.buyerRepository.findOneQuery({ _id: buyerId });
        if (!buyer) {
          throw new BadRequestException('Buyer ID is invalid');
        }
      }

      // Validate order for admin
      if (orderId) {
        const order = await this.orderRepository.findOrderById(orderId);
        if (!order) {
          throw new BadRequestException('Order ID is invalid');
        }
      }
    } else {
      // Non-admin users: filter by user's profile
      if (user.role === 'buyer') {
        const buyer = await this.buyerRepository.findOneQuery({ userId: user.id });
        if (buyer) {
          match.buyerId = buyer._id;
        } else {
          return { order: [], total: 0, currentPage: 1, totalPages: 0 };
        }
      } else if (user.role === 'seller') {
        const seller = await this.sellerRepository.findOneQuery({ userId: user.id });
        if (seller) {
          match.profileId = seller._id;
          match.profileType = 'seller';
        } else {
          return { order: [], total: 0, currentPage: 1, totalPages: 0 };
        }
      } else if (user.role === 'transporter') {
        const transporter = await this.transporterRepository.findOneQuery({ userId: user.id });
        if (transporter) {
          match.profileId = transporter._id;
          match.profileType = 'transporter';
        } else {
          return { order: [], total: 0, currentPage: 1, totalPages: 0 };
        }
      }
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);
    const [order, total] = await Promise.all([
      this.orderRepository.findOrders(match, skip, Number(limit)),
      this.orderRepository.countOrders(match),
    ]);

    console.log('Order fetched:', order.length, 'Total:', total);
    return {
      order,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllOrderAdmin(query: OrderQueryDto, user: IJwtPayload): Promise<OrderDocument[]> {
    if (user.role !== 'admin') {
      throw new BadRequestException('Admin access required');
    }
    return this.getAllOrder(query, user);
  }

  async getOrderCount(query: OrderQueryDto): Promise<number> {
    const { buyerId, profileId, type, status } = query;
    const match: any = { status: status || { $ne: 'cancelled' } };
    if (buyerId) match.buyerId = buyerId;
    if (profileId) match.profileId = profileId;
    if (type) match.type = type;
    return this.orderModel.countDocuments(match);
  }

  async getOneOrder(orderId: string): Promise<OrderDocument> {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    return order;
  }

  async updateStatusOrder(orderId: string, dto: OrderDto): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    order.status = dto.status;
    // if (dto.status === 'completed' && order.type === 'truck') {
    //   await this.truckService.unlockTruck(order.truckId);
    // }
    await order.save();
    return order;
  }

  async updatePriceOrder(orderId: string, dto: OrderDto): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    if (order.type === 'truck' && order.rfqStatus !== 'pending') {
      throw new BadRequestException('Cannot update price after RFQ response');
    }
    order.price = dto.price;
    order.loadingDate = dto.loadingDate;
    order.arrivalTime = dto.arrivalTime;
    if (order.type === 'truck') {
      order.rfqStatus = 'sent';
    }
    await order.save();
    return order;
  }

  async updateRfqStatusOrder(orderId: string, dto: OrderDto): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order || order.type !== 'truck') {
      throw new BadRequestException('Invalid truck order');
    }
    order.rfqStatus = dto.rfqStatus;
    if (dto.rfqStatus === 'accepted') {
      order.status = 'pending';
      // await this.truckService.lockTruck(order.truckId);
      await this.truckRepository.update(order.truckId, { status: 'locked' });

      // Cancel other pending order for the same truck
      await this.orderModel.updateMany(
        { truckId: order.truckId, _id: { $ne: orderId }, status: { $ne: 'completed' } },
        { status: 'cancelled' },
      );
      // await this.ticketService.create({ orderId, serviceFee: calculateFee(order.price) });
      const serviceFees = await this.platformConfigService.getServiceFees();
      const transporterFeeRate = Number(serviceFees.transporterServiceFee);
      const buyerFeeRate = Number(serviceFees.traderServiceFee);
      const transportFee = Number(order.price);


      if (
        isNaN(transporterFeeRate) ||
        isNaN(buyerFeeRate) ||
        isNaN(transportFee)
      ) {
        throw new BadRequestException('Invalid fee rates or offer price for ticket creation');
      }

      // Ensure only one ticket per order
      // const existingTicket = await this.ticketService.findByOrderId(order._id.toString());
      // if (!existingTicket) {
      await this.ticketService.create({
        orderId: order._id.toString(),
        transportFee,
        transporterServiceFee: Number(((transporterFeeRate / 100) * transportFee).toFixed(2)),
        buyerServiceFee: Number(((buyerFeeRate / 100) * transportFee).toFixed(2)),
      });
      // }
    }
    await order.save();
    return order;
  }

  async rejectAndCreateNegotiation(orderId: string, body: { price: number }, user: IJwtPayload): Promise<NegotiationDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order || order.type !== 'truck') {
      throw new BadRequestException('Invalid truck order');
    }
    if (order.buyerId.toString() !== user.id) {
      throw new BadRequestException('Unauthorized to reject order');
    }
    // You may want to inject negotiationModel here
    // ...existing code...
    // For brevity, this is left as a placeholder
    return null;
  }

  async deleteOrder(orderId: string): Promise<void> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    order.status = 'cancelled';
    await order.save();
  }


  async acceptNegotiationOrder(orderId: string, user: any, offerPrice?: number): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    let hasAccess = false;

    if (user.role === 'buyer') {
      const buyer = await this.buyerRepository.findOneQuery({ userId: user.id });
      if (buyer && order.buyerId.toString() === buyer._id.toString()) {
        hasAccess = true;
      }
    } else if (user.role === 'seller') {
      const seller = await this.sellerRepository.findOneQuery({ userId: user.id });
      if (seller && order.profileType === 'seller' && order.profileId.toString() === seller._id.toString()) {
        hasAccess = true;
      }
    } else if (user.role === 'transporter') {
      const transporter = await this.transporterRepository.findOneQuery({ userId: user.id });
      if (transporter && order.profileType === 'transporter' && order.profileId.toString() === transporter._id.toString()) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new BadRequestException('Unauthorized to update order');
    }

    order.status = 'in-progress';
    if (offerPrice) {
      order.price = offerPrice;
    }
    if (order.type === 'truck') {
      // order.rfqStatus = 'accepted';
      await this.notifyOtherBuyers(order, user);
      const serviceFees = await this.platformConfigService.getServiceFees();
      const transporterFeeRate = Number(serviceFees.transporterServiceFee);
      const buyerFeeRate = Number(serviceFees.traderServiceFee);
      const transportFee = Number(offerPrice);


      if (
        isNaN(transporterFeeRate) ||
        isNaN(buyerFeeRate) ||
        isNaN(transportFee)
      ) {
        throw new BadRequestException('Invalid fee rates or offer price for ticket creation');
      }

      // Ensure only one ticket per order
      // const existingTicket = await this.ticketService.findByOrderId(order._id.toString());
      // if (!existingTicket) {
      await this.ticketService.create({
        orderId: order._id.toString(),
        transportFee,
        transporterServiceFee: Number(((transporterFeeRate / 100) * transportFee).toFixed(2)),
        buyerServiceFee: Number(((buyerFeeRate / 100) * transportFee).toFixed(2)),
      });
      // }
    }
    await order.save();

    const recipient = await this.userRepository.findOne(
      order.buyerId.toString() === user.id ? order.profileId : order.buyerId,
    );
    if (recipient) {
      // Read and prepare email template
      let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/order-update.html'), 'utf8');

      // Prepare order details based on type
      const orderDetailsRows = order.type === 'truck' ?
        `<tr>
            <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Number:</td>
            <td style="padding:8px 0; color:#666;">${order.truckId}</td>
        </tr>
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600;">Loading Depot:</td>
            <td style="padding:8px 0; color:#666;">${order.loadingDepot}</td>
        </tr>` :
        `<tr>
            <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Product:</td>
            <td style="padding:8px 0; color:#666;">${order.productUploadId}</td>
        </tr>`;

      // Prepare additional details for accepted order
      const additionalDetailsRows = `
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600;">Price:</td>
            <td style="padding:8px 0; color:#10b981; font-weight:600;">₦${order.price?.toLocaleString() || ''}</td>
        </tr>`;

      // Prepare status-specific notice
      const statusNoticeBlock = `
        <div style="background:#ecfdf5; border-radius:8px; padding:20px; margin:0 0 24px 0;">
            <p style="font-size:16px; color:#065f46; margin:0;">
                🎉 Great news! Your ${order.type} order has been accepted. You can track its progress through your dashboard.
            </p>
        </div>`;

      generalHtml = generalHtml
        .replace(/{{UpdateTitle}}/g, 'Order Accepted - Next Steps')
        .replace(/{{StatusMessage}}/g, `Great news! ${user.firstName} has accepted your ${order.type} order.`)
        .replace(/{{OrderDetailsRows}}/g, orderDetailsRows)
        .replace(/{{AdditionalDetailsRows}}/g, additionalDetailsRows)
        .replace(/{{StatusNoticeBlock}}/g, statusNoticeBlock)
        .replace(/{{Recipient}}/g, `${recipient.firstName} ${recipient.lastName}`)
        .replace(/{{Status}}/g, 'Accepted')
        .replace(/{{UpdateTime}}/g, new Date().toLocaleString())
        .replace(/{{OrderUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/${order.type === 'truck' ? 'my-rfq' : 'my-order'}/${order._id}`);

      await this.resendService.sendMail({
        to: recipient.email,
        subject: 'Order Accepted',
        html: getHtmlWithFooter(generalHtml),
      });
    }

    return order;
  }

  async cancelOrder(orderId: string, user: any): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new BadRequestException('Order not found');
    }

    let hasAccess = false;

    if (user.role === 'buyer') {
      const buyer = await this.buyerRepository.findOneQuery({ userId: user._id });
      if (buyer && order.buyerId.toString() === buyer._id.toString()) {
        hasAccess = true;
      }
    } else if (user.role === 'seller') {
      const seller = await this.sellerRepository.findOneQuery({ userId: user._id });
      if (seller && order.profileType === 'seller' && order.profileId.toString() === seller._id.toString()) {
        hasAccess = true;
      }
    } else if (user.role === 'transporter') {
      const transporter = await this.transporterRepository.findOneQuery({ userId: user._id });
      if (transporter && order.profileType === 'transporter' && order.profileId.toString() === transporter._id.toString()) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new BadRequestException('Unauthorized to cancel order');
    }

    order.status = 'cancelled';
    // if (order.type === 'truck') {
    //     await this.truckRepository.update(order.truckId, { status: 'available' });
    // }
    await order.save();

    const recipient = await this.userRepository.findOne(
      order.buyerId._id.toString() === user._id ? order.profileId._id.toString() : order.buyerId._id.toString(),
    );
    if (recipient) {
      // Read and prepare email template
      let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/order-update.html'), 'utf8');

      // Prepare order details based on type
      const orderDetailsRows = order.type === 'truck' ?
        `<tr>
            <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Number:</td>
            <td style="padding:8px 0; color:#666;">${order.truckId}</td>
        </tr>
        <tr>
            <td style="padding:8px 0; color:#444; font-weight:600;">Loading Depot:</td>
            <td style="padding:8px 0; color:#666;">${order.loadingDepot}</td>
        </tr>` :
        `<tr>
            <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Product ID:</td>
            <td style="padding:8px 0; color:#666;">${order.productUploadId}</td>
        </tr>`;

      // Status-specific notice for cancellation
      const statusNoticeBlock = `
        <div style="background:#fee2e2; border-radius:8px; padding:20px; margin:0 0 24px 0;">
            <p style="font-size:16px; color:#991b1b; margin:0;">
                This order has been cancelled. No further action is required.
            </p>
        </div>`;

      generalHtml = generalHtml
        .replace(/{{UpdateTitle}}/g, 'Order Cancelled')
        .replace(/{{StatusMessage}}/g, `${user.firstName} has cancelled this ${order.type} order.`)
        .replace(/{{OrderDetailsRows}}/g, orderDetailsRows)
        .replace(/{{AdditionalDetailsRows}}/g, '')
        .replace(/{{StatusNoticeBlock}}/g, statusNoticeBlock)
        .replace(/{{Recipient}}/g, `${recipient.firstName} ${recipient.lastName}`)
        .replace(/{{Status}}/g, 'Cancelled')
        .replace(/{{UpdateTime}}/g, new Date().toLocaleString())
        .replace(/{{OrderUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/${order.type === 'truck' ? 'my-rfq' : 'my-order'}/${order._id}`);

      await this.resendService.sendMail({
        to: recipient.email,
        subject: `Order Cancelled`,
        html: getHtmlWithFooter(generalHtml),
      });
    }

    return order;
  }

  private async notifyOtherBuyers(order: OrderDocument, user: IJwtPayload): Promise<void> {
    if (order.type !== 'truck') return;

    const otherOrders = await this.orderModel.find({
      truckId: order.truckId,
      _id: { $ne: order._id },
      status: { $ne: 'completed' },
    });

    for (const otherOrder of otherOrders) {
      otherOrder.status = 'cancelled';
      await otherOrder.save();

      const recipient = await this.userRepository.findOne(otherOrder.buyerId);
      if (recipient && recipient._id.toString() !== user.id) {
        // Read and prepare email template for other buyers
        let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/order-update.html'), 'utf8');

        // Prepare order details for cancelled order
        const orderDetailsRows = otherOrder.type === 'truck' ?
          `<tr>
              <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Number:</td>
              <td style="padding:8px 0; color:#666;">${otherOrder.truckId}</td>
          </tr>
          <tr>
              <td style="padding:8px 0; color:#444; font-weight:600;">Loading Depot:</td>
              <td style="padding:8px 0; color:#666;">${otherOrder.loadingDepot}</td>
          </tr>` :
          `<tr>
              <td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Product ID:</td>
              <td style="padding:8px 0; color:#666;">${otherOrder.productUploadId}</td>
          </tr>`;

        // Prepare status notice for other buyers
        const statusNoticeBlock = `
          <div style="background:#fff7ed; border-radius:8px; padding:20px; margin:0 0 24px 0;">
              <p style="font-size:16px; color:#9a3412; margin:0;">
                  This order has been automatically cancelled as another buyer's offer was accepted for this ${otherOrder.type}.
                  You can explore other available options in your dashboard.
              </p>
          </div>`;

        generalHtml = generalHtml
          .replace(/{{UpdateTitle}}/g, 'Order Cancelled - Another Order Accepted')
          .replace(/{{StatusMessage}}/g, `Your ${otherOrder.type} order has been cancelled as another buyer's offer was accepted.`)
          .replace(/{{OrderDetailsRows}}/g, orderDetailsRows)
          .replace(/{{AdditionalDetailsRows}}/g, '')
          .replace(/{{StatusNoticeBlock}}/g, statusNoticeBlock)
          .replace(/{{Recipient}}/g, `${recipient.firstName} ${recipient.lastName}`)
          .replace(/{{Status}}/g, 'Cancelled (Other Accepted)')
          .replace(/{{UpdateTime}}/g, new Date().toLocaleString())
          .replace(/{{OrderUrl}}/g, `${process.env.FRONTEND_URL}/dashboard/my-rfq/${otherOrder._id}`);

        await this.resendService.sendMail({
          to: recipient.email,
          subject: 'Order Cancelled - Another Order Accepted',
          html: getHtmlWithFooter(generalHtml),
        });
      }
    }

    await this.truckRepository.update(order.truckId, { status: 'locked' });
  }
}
