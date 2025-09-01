import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticket, TicketSchema } from './entities/ticket.entity';
import { Transporter, TransporterSchema } from '../transporter/entities/transporter.entity';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
// import { forwardRef } from '@nestjs/common';
import { TicketRepository } from './repositories/ticket.repository';
import { TicketService } from './services/ticket.service';
import { TicketController } from './controllers/ticket.controller';
import { Order, OrderSchema } from '../order/entities/order.entity';
import { OrderRepository } from '../order/repositories/order.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Ticket.name, schema: TicketSchema },
            { name: Transporter.name, schema: TransporterSchema },
            { name: Seller.name, schema: SellerSchema },
            { name: Order.name, schema: OrderSchema },
        ]),
        // forwardRef(() => TruckOrderModule),
        
    ],
    providers: [TicketRepository, TicketService, OrderRepository],
    controllers: [TicketController],
    exports: [TicketService, TicketRepository, OrderRepository],
})
export class TicketModule { }
