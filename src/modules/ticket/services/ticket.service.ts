import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketRepository } from '../repositories/ticket.repository';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { UpdateTicketDto } from '../dto/update-ticket.dto';
import { Types } from 'mongoose';
import { OrderRepository } from 'src/modules/order/repositories/order.repository';

@Injectable()
export class TicketService {
    constructor(
        private readonly ticketRepository: TicketRepository,
        private readonly orderRepository: OrderRepository,
    ) { }

    async create(createTicketDto: CreateTicketDto) {
        // Convert truckOrderId to ObjectId if present
        const createData: Partial<CreateTicketDto & { orderId?: any }> = { ...createTicketDto };
        if (createData.orderId) {
            createData.orderId = new Types.ObjectId(createData.orderId);
        }
        return this.ticketRepository.create(createData);
    }

    async findAll() {
        return this.ticketRepository.findAll();
    }

    async findOne(id: string) {
        const ticket = await this.ticketRepository.findById(id);
        if (!ticket) throw new NotFoundException('Ticket not found');
        return ticket;
    }

    async findByOrderId(orderId: string) {
        const ticket = await this.ticketRepository.findByOrderId(orderId);
        if (!ticket) throw new NotFoundException('Ticket not found for this order');
        // Fetch and format order as in orderRepository.findOne
        const order = await this.orderRepository.findOrderById(orderId);
        return { ...ticket, order: order };
    }

    async update(id: string, updateTicketDto: UpdateTicketDto) {
        // Convert orderId to ObjectId if present
        const updateData: Partial<UpdateTicketDto & { orderId?: any }> = { ...updateTicketDto };
        if (updateData.orderId) {
            updateData.orderId = new Types.ObjectId(updateData.orderId);
        }
        const ticket = await this.ticketRepository.update(id, updateData);
        if (!ticket) throw new NotFoundException('Ticket not found');
        return ticket;
    }

    async remove(id: string) {
        const ticket = await this.ticketRepository.delete(id);
        if (!ticket) throw new NotFoundException('Ticket not found');
        return ticket;
    }
}
