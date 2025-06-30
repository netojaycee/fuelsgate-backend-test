import { OrderDto, OrderQueryDto } from '../dto/order.dto';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderRepository } from '../repositories/order.repository';
import { SellerRepository } from 'src/modules/seller/repositories/seller.repository';
import { ProductUploadRepository } from 'src/modules/product-upload/repositories/product-upload.repository';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { BuyerRepository } from 'src/modules/buyer/repositories/buyer.repository';
import { formatNumber, generateOrderId } from 'src/utils/helpers';
import { OrderGateway } from '../gateway/order.gateway';
import { endOfDay, startOfDay } from 'date-fns';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { join } from 'path';
import { MailerService } from '@nestjs-modules/mailer';
import { ProductRepository } from 'src/modules/product/repositories/product.repository';
@Injectable()
export class OrderService {
  constructor(
    private orderRepository: OrderRepository,
    private sellerRepository: SellerRepository,
    private buyerRepository: BuyerRepository,
    private productUploadRepository: ProductUploadRepository,
    @Inject(forwardRef(() => OrderGateway))
    private readonly orderGateway: OrderGateway,
    private readonly userRepository: UserRepository,
    private readonly mailService: MailerService,
    private readonly productRepository: ProductRepository,
  ) {}

  async getAllOrders(query: OrderQueryDto) {
    const {
      page,
      limit,
      status,
      trackingId,
      buyerId,
      sellerId,
      productUploadId,
    } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const searchFilter: any = {
      $and: [{ createdAt: { $gte: todayStart, $lte: todayEnd } }],
      $or: [],
    };

    let seller: any, buyer: any, productUpload: any;

    if (buyerId) buyer = await this.buyerRepository.findOne(buyerId);
    if (sellerId) seller = await this.sellerRepository.findOne(sellerId);
    if (productUploadId)
      productUpload =
        await this.productUploadRepository.findOne(productUploadId);

    if (buyerId && !buyer) throw new BadRequestException('Buyer ID is invalid');
    if (sellerId && !seller)
      throw new BadRequestException('Seller ID is invalid');
    if (productUploadId && !productUpload)
      throw new BadRequestException('Product ID is invalid');

    if (trackingId)
      searchFilter.$or.push({
        trackingId: { $regex: trackingId, $options: 'i' },
      });
    if (status)
      searchFilter.$or.push({ status: { $regex: status, $options: 'i' } });
    if (buyerId) searchFilter.$or.push({ buyerId: buyer?._id });
    if (sellerId) searchFilter.$or.push({ sellerId: seller?._id });
    if (productUploadId)
      searchFilter.$or.push({ productUploadId: productUpload?._id });

    if (!searchFilter.$or.length) delete searchFilter.$or;

    const orders = await this.orderRepository.findAll(
      searchFilter,
      offset,
      limit,
    );
    const total = await this.orderRepository.getTotal(searchFilter);

    return {
      orders,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrdersCount(query: OrderQueryDto) {
    const { status, trackingId, buyerId, sellerId, productUploadId } = query;

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const searchFilter: any = {
      $and: [{ createdAt: { $gte: todayStart, $lte: todayEnd } }],
      $or: [],
    };

    let seller: any, buyer: any, productUpload: any;

    if (buyerId) buyer = await this.buyerRepository.findOne(buyerId);
    if (sellerId) seller = await this.sellerRepository.findOne(sellerId);
    if (productUploadId)
      productUpload =
        await this.productUploadRepository.findOne(productUploadId);

    if (buyerId && !buyer) throw new BadRequestException('Buyer ID is invalid');
    if (sellerId && !seller)
      throw new BadRequestException('Seller ID is invalid');
    if (productUploadId && !productUpload)
      throw new BadRequestException('Product ID is invalid');

    if (trackingId)
      searchFilter.$or.push({
        trackingId: { $regex: trackingId, $options: 'i' },
      });
    if (status)
      searchFilter.$or.push({ status: { $regex: status, $options: 'i' } });
    if (buyerId) searchFilter.$or.push({ buyerId: buyer?._id });
    if (sellerId) searchFilter.$or.push({ sellerId: seller?._id });
    if (productUploadId)
      searchFilter.$or.push({ productUploadId: productUpload?._id });

    if (!searchFilter.$or.length) delete searchFilter.$or;

    return await this.orderRepository.getTotal(searchFilter);
  }

  async getOneOrder(orderId: string) {
    const order = await this.orderRepository.findOne(orderId);
    if (!order) {
      throw new NotFoundException('Order Not found');
    }
    return order;
  }

  async updateStatusOrder(orderId: string, body: OrderDto) {
    const _order = await this.orderRepository.findOne(orderId);

    if (!_order) throw new NotFoundException('Order Not found');

    if (body.status === 'completed') {
      const productUpload = await this.productUploadRepository.findOne(
        _order.productUploadId,
      );
      if (!productUpload)
        throw new NotFoundException('Product Upload Not found');
      productUpload.volume -= Number(_order.volume);
      await productUpload.save();
    }

    const order = await this.orderRepository.update(orderId, body);
    this.orderGateway.broadcastOrderStatus(order);
    return order;
  }

  async updatePriceOrder(orderId: string, body: OrderDto) {
    const order = await this.orderRepository.update(orderId, body);
    this.orderGateway.broadcastOrderPrice(order);
    return order;
  }

  async createNewOrder(payload: OrderDto, user: IJwtPayload) {
    if (user.role !== 'buyer') {
      throw new ForbiddenException(
        'You are not authorized to make this request',
      );
    }

    const [seller, buyer, productUpload, buyerUser] = await Promise.all([
      this.sellerRepository.findOne(payload.sellerId),
      this.buyerRepository.findOneQuery({ userId: user.id }),
      this.productUploadRepository.findOne(payload.productUploadId),
      this.userRepository.findOne(user.id),
    ]);

    if (!buyer) throw new BadRequestException('Buyer ID is invalid');
    if (!seller) throw new BadRequestException('Seller ID is invalid');
    if (!productUpload) throw new BadRequestException('Product ID is invalid');
    if (!buyerUser) throw new BadRequestException('Buyer User ID is invalid');

    const sellerUser = await this.userRepository.findOne(seller.userId);

    if (!sellerUser) throw new BadRequestException('Seller User ID is invalid');

    payload.buyerId = buyer._id;
    payload.sellerId = seller._id;
    payload.productUploadId = productUpload._id;
    payload.trackingId = generateOrderId('FG-ORD');

    const [order, product] = await Promise.all([
      this.orderRepository.create(payload),
      this.productRepository.findOne(productUpload.productId),
    ]);

    const productName = product.value.toUpperCase();
    const productMeasurementUnit = product?.unit;
    const recipientEmail = sellerUser.email;
    const recipientName = `${sellerUser.firstName} ${sellerUser.lastName}`;
    const senderName = `${buyerUser.firstName} ${buyerUser.lastName}`;
    const subject = `New Order Alert!`;

    await Promise.all([
      this.orderGateway.broadcastOrder(order, user),
      this.mailService.sendMail({
        to: recipientEmail,
        subject,
        template: join(__dirname, '../mails/new-order'),
        context: {
          Sender: senderName,
          Recipient: recipientName,
          ProductName: productName,
          Volume: `${formatNumber(order.volume)} ${productMeasurementUnit}`,
          OrderPrice: formatNumber(order.price),
          OrderUrl: `${process.env.FRONTEND_URL}/dashboard/order/${order._id}`,
          OrderTime: new Date().toLocaleString(),
        },
      }),
    ]);

    return order;
  }

  async deleteOrder(orderId: string) {
    const order = await this.orderRepository.delete(orderId);
    if (!order) {
      throw new NotFoundException('Order Not found');
    }
    return order;
  }
}
