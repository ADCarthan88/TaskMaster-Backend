import { prisma, wsService } from '../server';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type: 'TASK_DUE' | 'TASK_OVERDUE' | 'TASK_COMPLETED' | 'CATEGORY_CREATED' | 'SYSTEM';
  relatedTaskId?: string;
  relatedCategoryId?: string;
}

class NotificationService {
  // Create and send notification
  async createNotification(data: NotificationData) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          relatedTaskId: data.relatedTaskId,
          relatedCategoryId: data.relatedCategoryId,
        },
      });

      // Send real-time notification via WebSocket
      wsService.emitNotification(data.userId, notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get notifications for user
  async getUserNotifications(userId: string, limit: number = 20, offset: number = 0) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        relatedTask: {
          select: {
            id: true,
            title: true,
          },
        },
        relatedCategory: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string) {
    return await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  // Get unread count
  async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  // Check for due tasks and create notifications
  async checkDueTasks() {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks due within 24 hours that haven't been notified
    const dueTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: tomorrow,
        },
        completed: false,
        // Only tasks that haven't been notified about being due
        notifications: {
          none: {
            type: 'TASK_DUE',
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });

    // Create notifications for due tasks
    for (const task of dueTasks) {
      await this.createNotification({
        userId: task.userId,
        title: 'Task Due Soon',
        message: `Task "${task.title}" is due ${task.dueDate?.toLocaleDateString()}`,
        type: 'TASK_DUE',
        relatedTaskId: task.id,
      });
    }

    // Find overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        completed: false,
        // Only tasks that haven't been notified about being overdue
        notifications: {
          none: {
            type: 'TASK_OVERDUE',
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
          },
        },
      },
    });

    // Create notifications for overdue tasks
    for (const task of overdueTasks) {
      await this.createNotification({
        userId: task.userId,
        title: 'Task Overdue',
        message: `Task "${task.title}" was due ${task.dueDate?.toLocaleDateString()}`,
        type: 'TASK_OVERDUE',
        relatedTaskId: task.id,
      });
    }

    return {
      dueTasksNotified: dueTasks.length,
      overdueTasksNotified: overdueTasks.length,
    };
  }
}

export default new NotificationService();
