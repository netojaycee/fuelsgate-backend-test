import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { BuyerRepository } from 'src/modules/buyer/repositories/buyer.repository';
import { generateOrderId, formatNumber } from 'src/utils/helpers';
import { TruckOrderRepository } from '../repositories/truck-order.repository';
import { TruckOrderDto, TruckOrderQueryDto } from '../dto/truck-order.dto';
import { TruckRepository } from 'src/modules/truck/repositories/truck.repository';
import { OrderRepository } from 'src/modules/order/repositories/order.repository';
import { SellerRepository } from 'src/modules/seller/repositories/seller.repository';
import { TruckOrderGateway } from '../gateway/truck-order.gateway';
import { TransporterRepository } from 'src/modules/transporter/repositories/transporter.repository';
import { startOfDay } from 'date-fns';
import { endOfDay } from 'date-fns';
import { join } from 'path';
import { MailerService } from '@nestjs-modules/mailer';
import { UserRepository } from 'src/modules/user/repositories/user.repository';

@Injectable()
export class TruckOrderService {
  constructor(
    private truckOrderRepository: TruckOrderRepository,
    private truckRepository: TruckRepository,
    private buyerRepository: BuyerRepository,
    private sellerRepository: SellerRepository,
    private transporterRepository: TransporterRepository,
    private orderRepository: OrderRepository,
    @Inject(forwardRef(() => TruckOrderGateway))
    private readonly truckOrderGateway: TruckOrderGateway,
    private readonly mailService: MailerService,
    private readonly userRepository: UserRepository,
  ) { }

  async getAllOrders(query: TruckOrderQueryDto, user: IJwtPayload) {
    const {
      page,
      limit,
      status,
      trackingId,
      buyerId,
      truckId,
      profileId,
      profileType,
      orderId,
    } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    if (profileId && !profileType) {
      throw new BadRequestException('Please provide a profile type');
    }

    const weekStart = startOfDay(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000));
    const weekEnd = endOfDay(new Date());

    let profile: any, buyer: any, order: any;

    // Get the current user's profile based on their role
    const userProfile = await this.getUserProfile(user);

    if (buyerId) buyer = await this.buyerRepository.findOneQuery(buyerId);
    if (profileId && profileType === 'seller')
      profile = await this.sellerRepository.findOne(profileId);
    if (profileId && profileType === 'transporter')
      profile = await this.transporterRepository.findOne(profileId);
    if (orderId) order = await this.orderRepository.findOne(orderId);

    if (buyerId && !buyer) throw new BadRequestException('Buyer ID is invalid');
    if (profileId && !profile)
      throw new BadRequestException('Profile ID is invalid');
    if (orderId && !order) throw new BadRequestException('order ID is invalid');

    const searchFilter: any = {
      $and: [
        { createdAt: { $gte: weekStart, $lte: weekEnd } }
      ],
    };

    // Enforce user-specific filtering based on role - this is ALWAYS applied
    if (user.role === 'buyer') {
      // Buyers see orders where they are the buyer
      searchFilter.$and.push({ buyerId: userProfile._id });
    } else if (user.role === 'seller' || user.role === 'transporter') {
      // Sellers and transporters see orders where they are the profile owner
      searchFilter.$and.push({
        profileId: userProfile._id,
        profileType: user.role === 'seller' ? 'Seller' : 'Transporter'
      });
    }

    // Apply additional filters if provided (these are ANDed with user-specific filters)
    if (buyerId && buyer) {
      // Only apply if the buyer filter doesn't conflict with user access
      if (user.role === 'buyer' && buyer._id.toString() !== userProfile._id.toString()) {
        // Buyer can only see their own orders
        searchFilter.$and.push({ buyerId: { $exists: false } }); // This will return no results
      } else if (user.role !== 'buyer') {
        searchFilter.$and.push({ buyerId: buyer._id });
      }
    }
    if (orderId && order) searchFilter.$and.push({ orderId: order._id });
    if (profileId && profile) {
      // Only apply if the profile filter doesn't conflict with user access
      if ((user.role === 'seller' || user.role === 'transporter') &&
        profile._id.toString() !== userProfile._id.toString()) {
        // Seller/Transporter can only see their own orders
        searchFilter.$and.push({ profileId: { $exists: false } }); // This will return no results
      } else if (user.role === 'buyer') {
        searchFilter.$and.push({ profileId: profile._id });
      }
    }
    if (trackingId) {
      searchFilter.$and.push({
        trackingId: { $regex: trackingId, $options: 'i' },
      });
    }
    if (status) {
      searchFilter.$and.push({ status: { $regex: status, $options: 'i' } });
    }
    if (truckId) {
      searchFilter.$and.push({ truckId: { $regex: truckId, $options: 'i' } });
    }

    const truckOrders = await this.truckOrderRepository.findAll(
      searchFilter,
      offset,
      limit,
    );
    const total = await this.truckOrderRepository.getTotal(searchFilter);

    return {
      truckOrders,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTruckOrdersCount(query: TruckOrderQueryDto, user: IJwtPayload) {
    const {
      status,
      trackingId,
      buyerId,
      truckId,
      profileId,
      profileType,
      orderId,
    } = query;

    if (profileId && !profileType) {
      throw new BadRequestException('Please provide a profile type');
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    let profile: any, buyer: any, order: any;

    // Get the current user's profile based on their role
    const userProfile = await this.getUserProfile(user);

    if (buyerId) buyer = await this.buyerRepository.findOne(buyerId);
    if (profileId && profileType === 'seller')
      profile = await this.sellerRepository.findOne(profileId);
    if (profileId && profileType === 'transporter')
      profile = await this.transporterRepository.findOne(profileId);
    if (orderId) order = await this.orderRepository.findOne(orderId);

    if (buyerId && !buyer) throw new BadRequestException('Buyer ID is invalid');
    if (profileId && !profile)
      throw new BadRequestException('Profile ID is invalid');
    if (orderId && !order) throw new BadRequestException('order ID is invalid');

    const searchFilter: any = {
      $and: [
        { createdAt: { $gte: todayStart, $lte: todayEnd } }
      ],
    };

    // Enforce user-specific filtering based on role - this is ALWAYS applied
    if (user.role === 'buyer') {
      // Buyers see orders where they are the buyer
      searchFilter.$and.push({ buyerId: userProfile._id });
    } else if (user.role === 'seller' || user.role === 'transporter') {
      // Sellers and transporters see orders where they are the profile owner
      searchFilter.$and.push({
        profileId: userProfile._id,
        profileType: user.role === 'seller' ? 'Seller' : 'Transporter'
      });
    }

    // Apply additional filters if provided (these are ANDed with user-specific filters)
    if (buyerId && buyer) {
      // Only apply if the buyer filter doesn't conflict with user access
      if (user.role === 'buyer' && buyer._id.toString() !== userProfile._id.toString()) {
        // Buyer can only see their own orders
        searchFilter.$and.push({ buyerId: { $exists: false } }); // This will return no results
      } else if (user.role !== 'buyer') {
        searchFilter.$and.push({ buyerId: buyer._id });
      }
    }
    if (orderId && order) searchFilter.$and.push({ orderId: order._id });
    if (profileId && profile) {
      // Only apply if the profile filter doesn't conflict with user access
      if ((user.role === 'seller' || user.role === 'transporter') &&
        profile._id.toString() !== userProfile._id.toString()) {
        // Seller/Transporter can only see their own orders
        searchFilter.$and.push({ profileId: { $exists: false } }); // This will return no results
      } else if (user.role === 'buyer') {
        searchFilter.$and.push({ profileId: profile._id });
      }
    }
    if (trackingId) {
      searchFilter.$and.push({
        trackingId: { $regex: trackingId, $options: 'i' },
      });
    }
    if (status) {
      searchFilter.$and.push({ status: { $regex: status, $options: 'i' } });
    }
    if (truckId) {
      searchFilter.$and.push({ truckId: { $regex: truckId, $options: 'i' } });
    }

    return await this.truckOrderRepository.getTotal(searchFilter);
  }

  async getOneOrder(truckOrderId: string, user: IJwtPayload) {
    const truckOrder = await this.truckOrderRepository.findOne(truckOrderId);
    if (!truckOrder) {
      throw new NotFoundException('Truck order Not found');
    }

    // Verify user has access to this order
    const userProfile = await this.getUserProfile(user);

    if (user.role === 'buyer') {
      if (truckOrder.buyerId._id.toString() !== userProfile._id.toString()) {
        throw new ForbiddenException('You are not authorized to view this order');
      }
    } else if (user.role === 'seller') {
      if (truckOrder.profileId._id.toString() !== userProfile._id.toString() ||
        truckOrder.profileType !== 'Seller') {
        throw new ForbiddenException('You are not authorized to view this order');
      }
    } else if (user.role === 'transporter') {
      if (truckOrder.profileId._id.toString() !== userProfile._id.toString() ||
        truckOrder.profileType !== 'Transporter') {
        throw new ForbiddenException('You are not authorized to view this order');
      }
    } else {
      throw new ForbiddenException('You are not authorized to view this order');
    }

    return truckOrder;
    }
    async updateStatusOrder(truckOrderId: string, body: TruckOrderDto, type: 'rfq' | 'order') {
    const order = await this.truckOrderRepository.update(truckOrderId, body);
    if (!order) throw new BadRequestException('Order ID is invalid');

    // If rfqStatus is changed to accepted, update truck status to locked
    if (type === 'rfq' && body.rfqStatus?.toLowerCase() === 'accepted') {
      const truck = await this.truckRepository.findOne(order.truckId);
      if (truck) {
         await this.truckRepository.update(truck._id, { status: 'locked' });
      }
    }

    this.truckOrderGateway.broadcastOrderStatus(order);

    // Send emails based on type and status
    await this.sendStatusUpdateEmail(order, type);

    return order;
    }

  private async sendStatusUpdateEmail(order: any, type: 'rfq' | 'order') {
    try {
      const [truck, profile, buyer] = await Promise.all([
        this.truckRepository.findOne(order.truckId),
        order.profileType.toLowerCase() === 'seller'
          ? this.sellerRepository.findOne(order.profileId)
          : this.transporterRepository.findOne(order.profileId),
        this.buyerRepository.findOne(order.buyerId),
      ]);

      if (!profile || !truck || !buyer) {
        console.error('Missing data for email sending:', { profile: !!profile, truck: !!truck, buyer: !!buyer });
        return;
      }

      const [truckOwner, buyerUser] = await Promise.all([
        this.userRepository.findOne(profile.userId),
        this.userRepository.findOne(buyer.userId),
      ]);

      if (!truckOwner || !buyerUser) {
        console.error('Missing user data for email sending:', { truckOwner: !!truckOwner, buyerUser: !!buyerUser });
        return;
      }

      const baseContext = {
        TruckId: truck.truckNumber,
        LoadingDepot: order.loadingDepot,
        Destination: order.destination,
        State: order.state,
        City: order.city,
        TruckArrivalTime: order.arrivalTime ? new Date(order.arrivalTime).toLocaleString() : 'TBD',
        OrderTime: new Date().toLocaleString(),
        QuotePrice: order.price ? formatNumber(order.price) : 'N/A',
        OrderUrl: `${process.env.FRONTEND_URL}/dashboard/my-rfq/${order._id}`,
      };

      if (type === 'order') {
        // Handle order status updates (in-progress, completed)
        await this.handleOrderStatusEmail(order, truckOwner, buyerUser, baseContext, truck);
      } else if (type === 'rfq') {
        // Handle RFQ status updates (sent, accepted, rejected)
        await this.handleRfqStatusEmail(order, truckOwner, buyerUser, baseContext);
      }
    } catch (error) {
      console.error('Error sending status update email:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  private async handleOrderStatusEmail(order: any, truckOwner: any, buyerUser: any, baseContext: any, truck: any) {
    const status = order.status?.toLowerCase();

    if (status === 'in-progress') {
      // Order moved to in-progress - notify buyer
      await this.mailService.sendMail({
        to: buyerUser.email,
        subject: 'Order Status Update - In Progress',
        template: join(__dirname, '../mails/order-in-progress'),
        context: {
          ...baseContext,
          Recipient: `${buyerUser.firstName} ${buyerUser.lastName}`,
          Sender: `${truckOwner.firstName} ${truckOwner.lastName}`,
        },
      });
    } else if (status === 'completed') {
      this.truckRepository.update(truck._id, { ...truck, status: 'locked' });
      // Order completed - notify buyer
      await this.mailService.sendMail({
        to: buyerUser.email,
        subject: 'Order Completed Successfully!',
        template: join(__dirname, '../mails/order-completed'),
        context: {
          ...baseContext,
          Recipient: `${buyerUser.firstName} ${buyerUser.lastName}`,
          Sender: `${truckOwner.firstName} ${truckOwner.lastName}`,
        },
      });
    }
  }

  private async handleRfqStatusEmail(order: any, truckOwner: any, buyerUser: any, baseContext: any) {
    const rfqStatus = order.rfqStatus?.toLowerCase();

    if (rfqStatus === 'sent') {
      // Quote sent - notify buyer
      await this.mailService.sendMail({
        to: buyerUser.email,
        subject: 'New Quote Received!',
        template: join(__dirname, '../mails/rfq-sent'),
        context: {
          ...baseContext,
          Recipient: `${buyerUser.firstName} ${buyerUser.lastName}`,
          Sender: `${truckOwner.firstName} ${truckOwner.lastName}`,
        },
      });
    } else if (rfqStatus === 'accepted') {
      // Quote accepted - notify truck owner
      await this.mailService.sendMail({
        to: truckOwner.email,
        subject: 'Quote Accepted - Congratulations!',
        template: join(__dirname, '../mails/rfq-accepted'),
        context: {
          ...baseContext,
          Recipient: `${truckOwner.firstName} ${truckOwner.lastName}`,
          BuyerName: `${buyerUser.firstName} ${buyerUser.lastName}`,
          OrderUrl: `${process.env.FRONTEND_URL}/dashboard/rfq/${order._id}`,
        },
      });
    } else if (rfqStatus === 'rejected') {
      // Quote rejected - notify truck owner
      await this.mailService.sendMail({
        to: truckOwner.email,
        subject: 'Quote Update - Not Selected',
        template: join(__dirname, '../mails/rfq-rejected'),
        context: {
          ...baseContext,
          Recipient: `${truckOwner.firstName} ${truckOwner.lastName}`,
          BuyerName: `${buyerUser.firstName} ${buyerUser.lastName}`,
          OrderUrl: `${process.env.FRONTEND_URL}/dashboard/available-orders`,
        },
      });
    }
  }

  async updatePriceOrder(truckOrderId: string, body: TruckOrderDto) {
    const order = await this.truckOrderRepository.update(truckOrderId, body);
    if (!order) throw new BadRequestException('Order ID is invalid');

    const [truck, profile, buyer] = await Promise.all([
      this.truckRepository.findOne(order.truckId),
      order.profileType.toLowerCase() === 'seller'
        ? this.sellerRepository.findOne(order.profileId)
        : this.transporterRepository.findOne(order.profileId),
      this.buyerRepository.findOne(order.buyerId),
    ]);

    if (!profile) throw new BadRequestException('Profile ID is invalid');
    if (!truck) throw new BadRequestException('Truck ID is invalid');
    if (!buyer) throw new BadRequestException('Buyer ID is invalid');

    // const [sender, recipient] = await Promise.all([
    //   this.userRepository.findOne(profile.userId),
    //   this.userRepository.findOne(buyer.userId),
    // ]);

    // if (!recipient) throw new BadRequestException('Recipient ID is invalid');
    // if (!sender) throw new BadRequestException('Sender ID is invalid');

    // const to = recipient.email;
    // const recipientName = `${recipient.firstName} ${recipient.lastName}`;
    // const senderName = `${sender.firstName} ${sender.lastName}`;
    // const quotePrice = formatNumber(order.price);
    // const truckArrivalTime = new Date(order.arrivalTime).toLocaleString();
    // const loadingDepot = order.loadingDepot;
    // const destination = order.destination;
    // const state = order.state;
    // const city = order.city;
    // const truckId = truck.truckNumber;
    // const subject = `New Quote Alert!`;

    await Promise.all([
      this.truckOrderGateway.broadcastOrderPrice(order),
      // this.mailService.sendMail({
      //   to,
      //   subject,
      //   template: join(__dirname, '../mails/send-quote'),
      //   context: {
      //     Sender: senderName,
      //     Recipient: recipientName,
      //     QuotePrice: quotePrice,
      //     TruckArrivalTime: truckArrivalTime,
      //     LoadingDepot: loadingDepot,
      //     Destination: destination,
      //     State: state,
      //     City: city,
      //     TruckId: truckId,
      //     OrderUrl: `${process.env.FRONTEND_URL}/dashboard/my-rfq/${order._id}`,
      //     OrderTime: new Date().toLocaleString(),
      //   },
      // }),
    ]);

    return order;
  }

  async createNewOrder(payload: TruckOrderDto, user: IJwtPayload) {
    if (user.role !== 'buyer')
      throw new ForbiddenException(
        'You are not authorized to make this request',
      );
    const [truck, buyer] = await Promise.all([
      this.truckRepository.findOne(payload.truckId),
      this.buyerRepository.findOneQuery({ userId: user.id }),
    ]);

    if (payload.orderId) {
      const order = await this.orderRepository.findOne(payload?.orderId);
      if (!order) throw new BadRequestException('Order ID is invalid');
      payload.orderId = order._id;
    }

    if (!buyer) throw new BadRequestException('Buyer ID is invalid');
    if (!truck) throw new BadRequestException('Truck ID is invalid');

    payload.buyerId = buyer._id;
    payload.truckId = truck._id;
    payload.profileId = truck.profileId;
    payload.profileType = truck.profileType;
    payload.trackingId = generateOrderId('FG-TORD');

    let profile: any;

    if (truck.profileType.toLowerCase() === 'seller') {
      profile = await this.sellerRepository.findOne(truck.profileId);
    } else if (truck.profileType.toLowerCase() === 'transporter') {
      profile = await this.transporterRepository.findOne(truck.profileId);
    }

    if (!profile) throw new BadRequestException('Profile ID is invalid');

    const [recipient, sender, order] = await Promise.all([
      this.userRepository.findOne(profile.userId),
      this.userRepository.findOne(buyer.userId),
      this.truckOrderRepository.create(payload),
    ]);

    if (!recipient) throw new BadRequestException('Recipient ID is invalid');
    if (!sender) throw new BadRequestException('Sender ID is invalid');

    const to = recipient.email;
    const recipientName = `${recipient.firstName} ${recipient.lastName}`;
    const senderName = `${sender.firstName} ${sender.lastName}`;
    const subject = `New Truck Order Alert!`;

    await Promise.all([
      this.truckOrderGateway.broadcastOrder(order, user),
      // this.truckRepository.update(truck._id, { ...truck, status: 'processing' }),
      this.mailService.sendMail({
        to,
        subject,
        template: join(__dirname, '../mails/new-order'),
        context: {
          Sender: senderName,
          Recipient: recipientName,
          LoadingDepot: order.loadingDepot,
          Destination: order.destination,
          State: order.state,
          City: order.city,
          TruckId: truck.truckNumber,
          OrderUrl: `${process.env.FRONTEND_URL}/dashboard/rfq/${order._id}`,
          OrderTime: new Date().toLocaleString(),
        },
      }),
    ]);

    return order;
  }

  async deleteOrder(truckOrderId: string) {
    const truckOrder = await this.truckOrderRepository.delete(truckOrderId);
    if (!truckOrder) {
      throw new NotFoundException('Truck Order Not found');
    }
    return truckOrder;
  }

  /**
   * Utility method to get user profile based on role
   * @param user - JWT payload containing user info
   * @returns User profile object
   */
  private async getUserProfile(user: IJwtPayload) {
    let userProfile: any;
    if (user.role === 'buyer') {
      userProfile = await this.buyerRepository.findOneQuery({ userId: user.id });
    } else if (user.role === 'seller') {
      userProfile = await this.sellerRepository.findOneQuery({ userId: user.id });
    } else if (user.role === 'transporter') {
      userProfile = await this.transporterRepository.findOneQuery({ userId: user.id });
    } else if (user.role === 'admin') {
      // Admin users don't have a specific profile, return a placeholder
      return { _id: 'admin', userId: user.id, role: 'admin' };
    } else {
      throw new ForbiddenException('You are not authorized to access orders');
    }

    if (!userProfile) {
      throw new BadRequestException('User profile not found');
    }

    return userProfile;
  }

  /**
   * Admin method to get all orders without user filtering
   * Only for admin users or internal system use
   * @param query - Query parameters
   * @param user - JWT payload (must have admin role)
   */
  async getAllOrdersAdmin(query: TruckOrderQueryDto, user: IJwtPayload) {
    // Ensure only admins can access this method
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only admins can access all orders');
    }

    const {
      page,
      limit,
      status,
      trackingId,
      buyerId,
      truckId,
      profileId,
      profileType,
      orderId,
    } = query;

    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    if (profileId && !profileType) {
      throw new BadRequestException('Please provide a profile type');
    }

    const weekStart = startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const weekEnd = endOfDay(new Date());

    let profile: any, buyer: any, order: any;

    if (buyerId) buyer = await this.buyerRepository.findOneQuery(buyerId);
    if (profileId && profileType === 'seller')
      profile = await this.sellerRepository.findOne(profileId);
    if (profileId && profileType === 'transporter')
      profile = await this.transporterRepository.findOne(profileId);
    if (orderId) order = await this.orderRepository.findOne(orderId);

    if (buyerId && !buyer) throw new BadRequestException('Buyer ID is invalid');
    if (profileId && !profile)
      throw new BadRequestException('Profile ID is invalid');
    if (orderId && !order) throw new BadRequestException('order ID is invalid');

    const searchFilter: any = {
      $and: [
        { createdAt: { $gte: weekStart, $lte: weekEnd } }
      ],
    };

    // Apply filters without user restrictions (admin view)
    if (buyerId && buyer) searchFilter.$and.push({ buyerId: buyer._id });
    if (orderId && order) searchFilter.$and.push({ orderId: order._id });
    if (profileId && profile) searchFilter.$and.push({ profileId: profile._id });
    if (trackingId) {
      searchFilter.$and.push({
        trackingId: { $regex: trackingId, $options: 'i' },
      });
    }
    if (status) {
      searchFilter.$and.push({ status: { $regex: status, $options: 'i' } });
    }
    if (truckId) {
      searchFilter.$and.push({ truckId: { $regex: truckId, $options: 'i' } });
    }

    const truckOrders = await this.truckOrderRepository.findAll(
      searchFilter,
      offset,
      limit,
    );
    const total = await this.truckOrderRepository.getTotal(searchFilter);

    return {
      truckOrders,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get orders by specific user role and profile ID
   * Useful for admin or cross-role queries
   * @param profileId - Profile ID to query
   * @param profileType - Type of profile (buyer, seller, transporter)
   * @param query - Query parameters
   * @param user - JWT payload (must have admin role or proper permissions)
   */
  async getOrdersByProfile(profileId: string, profileType: 'buyer' | 'seller' | 'transporter', query: TruckOrderQueryDto, user: IJwtPayload) {
    // Only admins or the profile owner can access this
    const userProfile = await this.getUserProfile(user);

    if (user.role !== 'admin' && userProfile._id.toString() !== profileId) {
      throw new ForbiddenException('You can only access your own orders');
    }

    const {
      page,
      limit,
      status,
      trackingId,
      truckId,
      orderId,
    } = query;

    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    const weekStart = startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const weekEnd = endOfDay(new Date());

    let order: any;
    if (orderId) order = await this.orderRepository.findOne(orderId);
    if (orderId && !order) throw new BadRequestException('order ID is invalid');

    const searchFilter: any = {
      $and: [
        { createdAt: { $gte: weekStart, $lte: weekEnd } }
      ],
    };

    // Filter by profile
    if (profileType === 'buyer') {
      searchFilter.$and.push({ buyerId: profileId });
    } else {
      searchFilter.$and.push({
        profileId: profileId,
        profileType: profileType === 'seller' ? 'Seller' : 'Transporter'
      });
    }

    // Apply additional filters
    if (orderId && order) searchFilter.$and.push({ orderId: order._id });
    if (trackingId) {
      searchFilter.$and.push({
        trackingId: { $regex: trackingId, $options: 'i' },
      });
    }
    if (status) {
      searchFilter.$and.push({ status: { $regex: status, $options: 'i' } });
    }
    if (truckId) {
      searchFilter.$and.push({ truckId: { $regex: truckId, $options: 'i' } });
    }

    const truckOrders = await this.truckOrderRepository.findAll(
      searchFilter,
      offset,
      limit,
    );
    const total = await this.truckOrderRepository.getTotal(searchFilter);

    return {
      truckOrders,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }
}
