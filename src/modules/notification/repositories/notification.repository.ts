import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository {
    constructor(
        @InjectModel(Notification.name)
        private readonly notificationModel: Model<NotificationDocument>,
    ) { }

    async create(data: Partial<Notification>): Promise<Notification> {
        return this.notificationModel.create(data);
    }

    async findByUser(userId: Types.ObjectId, limit = 20): Promise<Notification[]> {
        return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
    }

    async countUnread(userId: Types.ObjectId): Promise<number> {
        return this.notificationModel.countDocuments({ userId, read: false });
    }

    async markAsRead(notificationId: Types.ObjectId): Promise<void> {
        await this.notificationModel.updateOne({ _id: notificationId }, { $set: { read: true } });
    }

    async markAllAsRead(userId: Types.ObjectId): Promise<void> {
        await this.notificationModel.updateMany({ userId, read: false }, { $set: { read: true } });
    }

    async getById(notificationId: Types.ObjectId): Promise<Notification | null> {
        return this.notificationModel.findById(notificationId).lean();
    }

    async delete(notificationId: Types.ObjectId): Promise<void> {
        await this.notificationModel.deleteOne({ _id: notificationId });
    }

    async markTypeAsRead(userId: Types.ObjectId, types: string[]): Promise<void> {
        await this.notificationModel.updateMany(
            { userId, type: { $in: types }, read: false },
            { $set: { read: true } }
        );
    }

    async countUnreadByTypes(userId: Types.ObjectId, types: string[]): Promise<number> {
        return this.notificationModel.countDocuments({
            userId,
            type: { $in: types },
            read: false
        });
    }
}