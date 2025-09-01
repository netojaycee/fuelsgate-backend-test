import { Controller, Get, Post, Delete, Param, Query } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { Types } from 'mongoose';
import { Public } from 'src/shared/decorators/public.route.decorator';

@Controller('notification')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Public()
    @Get('user/:userId/badge-counts')
    async getBadgeCounts(@Param('userId') userId: string) {
        console.log(userId)
        const productOrderCount = await this.notificationService.getUnreadCountByTypes(
            new Types.ObjectId(userId),
            ['new_product_order', 'new_product_quote', 'product_order_status_update']
        );
        const truckOrderCount = await this.notificationService.getUnreadCountByTypes(
            new Types.ObjectId(userId),
            ['new_truck_order', 'new_truck_quote', 'truck_rfq_sent', 'truck_order_status_update']
        );
        console.log(truckOrderCount, "truckOrderCount")
        const chatCount = await this.notificationService.getUnreadCountByTypes(
            new Types.ObjectId(userId),
            ['new_chat_message']
        );
        console.log(chatCount, "chatCount")


        return {
            product_order: productOrderCount,
            truck_order: truckOrderCount,
            chat: chatCount
        };
    }

    @Get('user/:userId')
    async getUserNotifications(@Param('userId') userId: string, @Query('limit') limit = 20) {
        return this.notificationService.getUserNotifications(new Types.ObjectId(userId), Number(limit));
    }

    @Get('user/:userId/unread-count')
    async getUnreadCount(@Param('userId') userId: string) {
        return { count: await this.notificationService.getUnreadCount(new Types.ObjectId(userId)) };
    }

    @Get(':id')
    async getNotificationById(@Param('id') id: string) {
        return this.notificationService.getNotificationById(new Types.ObjectId(id));
    }

    @Post('mark-read/:id')
    async markAsRead(@Param('id') id: string) {
        await this.notificationService.markAsRead(new Types.ObjectId(id));
        return { success: true };
    }

    @Post('mark-all-read/:userId')
    async markAllAsRead(@Param('userId') userId: string) {
        await this.notificationService.markAllAsRead(new Types.ObjectId(userId));
        return { success: true };
    }

    @Delete(':id')
    async deleteNotification(@Param('id') id: string) {
        await this.notificationService.deleteNotification(new Types.ObjectId(id));
        return { success: true };
    }

    @Post('mark-category-read/:userId/:category')
    async markCategoryAsRead(@Param('userId') userId: string, @Param('category') category: string) {
        await this.notificationService.markCategoryAsRead(new Types.ObjectId(userId), category);
        return { success: true };
    }

    
}