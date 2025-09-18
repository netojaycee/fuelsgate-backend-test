import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../entities/order.entity';

@Injectable()
export class OrderRepository {
    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    ) { }

    async createOrder(data: Partial<Order>): Promise<OrderDocument> {
        return this.orderModel.create(data);
    }

    async findOrderById(id: string | Types.ObjectId): Promise<any> {
        // First, fetch the order without population to get profileType
        const order = await this.orderModel.findById(id).exec();
        if (!order) return null;

        // Determine the model for profileId
        let profileModel = null;
        switch (order.profileType) {
            case 'seller':
                profileModel = 'Seller';
                break;
            case 'transporter':
                profileModel = 'Transporter';
                break;
            default:
                profileModel = null;
        }

        // Populate buyerId > userId, profileId (with correct model) > userId, and productUploadId, truckId
        const populatedOrder = await this.orderModel
            .findById(id)
            .populate({
                path: 'buyerId',
                populate: { path: 'userId' }
            })
            .populate(profileModel ? {
                path: 'profileId',
                model: profileModel,
                populate: { path: 'userId' }
            } : {
                path: 'profileId',
            })
            .populate({
                path: 'productUploadId',
                populate: { path: 'depotHubId' }
            })
            .populate({
                path: 'truckId',
                populate: [
                    { path: 'depotHubId' },
                    { path: 'productId' }
                ]
            })
            .exec();

        // Try to find negotiation by orderId
        // You need to import the Negotiation model at the top of this file:
        // import { Negotiation } from '../entities/negotiation.entity';
        let negotiationId: string | null = null;
        if (populatedOrder) {
            const negotiation = await (populatedOrder as any).model('Negotiation').findOne({ orderId: populatedOrder._id }).exec();
            negotiationId = negotiation ? negotiation._id.toString() : null;
        }

        // Return order with negotiationId
        return populatedOrder ? Object.assign(populatedOrder.toObject(), { negotiationId }) : null;
    }

    async findOrders(
        filter: any = {},
        skip = 0,
        limit = 10
    ): Promise<(OrderDocument & { negotiationId?: string | null })[]> {
        // Fetch orders without population to get profileType for each
        const orders = await this.orderModel
            .find(filter)
            // .lean()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
            // .populate({ path: 'truckId', populate: { path: 'productId' } })
            // .populate({ path: 'buyerId', populate: { path: 'userId' } })
            // .populate({ path: 'profileId', populate: { path: 'userId' } });

        // Prepare population options and negotiationId for each order
        const populatedOrders = await Promise.all(orders.map(async (order) => {
            let profileModel = null;
            switch (order.profileType) {
                case 'seller':
                    profileModel = 'Seller';
                    break;
                case 'transporter':
                    profileModel = 'Transporter';
                    break;
                default:
                    profileModel = null;
            }
            const populatedOrder = await this.orderModel
                .findById(order._id)
                .populate({
                    path: 'buyerId',
                    populate: { path: 'userId' }
                })
                .populate(profileModel ? {
                    path: 'profileId',
                    model: profileModel,
                    populate: { path: 'userId' }
                } : {
                    path: 'profileId',
                })
                .populate({
                    path: 'productUploadId',
                    populate: { path: 'depotHubId' }
                })
                .populate({
                    path: 'truckId',
                    populate: [
                        { path: 'depotHubId' },
                        { path: 'productId' }
                    ]
                })
                .exec();

            // Find negotiation by orderId
            let negotiationId: string | null = null;
            if (populatedOrder) {
                const negotiation = await (populatedOrder as any).model('Negotiation').findOne({ orderId: populatedOrder._id }).exec();
                negotiationId = negotiation ? negotiation._id.toString() : null;
            }

            return populatedOrder
                ? Object.assign(populatedOrder.toObject(), { negotiationId })
                : null;
        }));

        // Filter out any nulls (in case an order was deleted between queries)
        return populatedOrders.filter(Boolean) as (OrderDocument & { negotiationId?: string | null })[];
    }

    async countOrders(filter: any = {}): Promise<number> {
        return this.orderModel.countDocuments(filter).exec();
    }

    async updateOrder(id: string, update: Partial<Order>): Promise<OrderDocument | null> {
        return this.orderModel.findByIdAndUpdate(id, update, { new: true }).exec();
    }

    async deleteOrder(id: string): Promise<void> {
        await this.orderModel.findByIdAndDelete(id).exec();
    }
}
