import express from 'express';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import notificationService from '../services/notification';

const router = express.Router();
router.use(authenticate);

// Get all notifications for user
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const notifications = await notificationService.getUserNotifications(
      req.user!.id,
      limit,
      offset
    );

    const unreadCount = await notificationService.getUnreadCount(req.user!.id);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          page,
          limit,
          hasMore: notifications.length === limit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', async (req: AuthRequest, res, next) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user!.id);

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const result = await notificationService.markAsRead(id, req.user!.id);

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification not found' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.patch('/read-all', async (req: AuthRequest, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user!.id);

    res.status(200).json({
      success: true,
      data: { updatedCount: result.count },
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const result = await notificationService.deleteNotification(id, req.user!.id);

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Notification not found' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
