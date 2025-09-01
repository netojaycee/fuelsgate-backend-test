import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import { Types } from 'mongoose';

@Injectable()
export class NotificationService {
    constructor(private readonly notificationRepository: NotificationRepository) { }

    async createNotification(data: {
        userId: Types.ObjectId;
        type: string;
        message?: string;
        relatedId?: Types.ObjectId;
        meta?: any;
    }) {
        return this.notificationRepository.create({ ...data, read: false });
    }

    async getUserNotifications(userId: Types.ObjectId, limit = 20) {
        return this.notificationRepository.findByUser(userId, limit);
    }

    async getUnreadCount(userId: Types.ObjectId) {
        return this.notificationRepository.countUnread(userId);
    }

    async markAsRead(notificationId: Types.ObjectId) {
        return this.notificationRepository.markAsRead(notificationId);
    }

    async markAllAsRead(userId: Types.ObjectId) {
        return this.notificationRepository.markAllAsRead(userId);
    }

    async getNotificationById(notificationId: Types.ObjectId) {
        return this.notificationRepository.getById(notificationId);
    }

    async deleteNotification(notificationId: Types.ObjectId) {
        return this.notificationRepository.delete(notificationId);
    }

    async markCategoryAsRead(userId: Types.ObjectId, category: string) {
        const typePatterns = {
            'product_order': ['new_product_order', 'new_product_quote', 'product_order_status_update'],
            'truck_order': ['new_truck_order', 'new_truck_quote', 'truck_order_status_update'],
            'chat': ['new_chat_message']
        };

        const types = typePatterns[category] || [];
        return this.notificationRepository.markTypeAsRead(userId, types);
    }

    async getUnreadCountByTypes(userId: Types.ObjectId, types: string[]) {
        return this.notificationRepository.countUnreadByTypes(userId, types);
    }
}