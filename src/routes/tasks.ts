import express from 'express';
import { prisma, wsService } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '../utils/validation';
// Remove Priority enum import since we're using strings now

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all tasks for authenticated user
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    // Validate query parameters
    const { error, value } = taskQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const {
      page,
      limit,
      search,
      completed,
      priority,
      categoryId,
      sortBy,
      sortOrder,
    } = value;

    // Build where clause
    const where: any = {
      userId: req.user!.id,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (completed !== undefined) {
      where.completed = completed;
    }

    if (priority) {
      where.priority = priority;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'priority') {
      // Custom priority ordering: URGENT > HIGH > MEDIUM > LOW
      orderBy.priority = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Get total count for pagination
    const totalTasks = await prisma.task.count({ where });

    // Get tasks with pagination
    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalTasks / limit);

    res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          currentPage: page,
          totalPages,
          totalTasks,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single task by ID
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found' },
      });
    }

    res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

// Create new task
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    // Validate request body
    const { error, value } = createTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const { title, description, priority, dueDate, categoryId } = value;

    // Verify category belongs to user if provided
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: req.user!.id,
        },
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          error: { message: 'Category not found or does not belong to user' },
        });
      }
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority as string,
        dueDate: dueDate ? new Date(dueDate) : null,
        categoryId,
        userId: req.user!.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Emit WebSocket event for real-time updates
    wsService.emitTaskCreated(req.user!.id, task);

    res.status(201).json({
      success: true,
      data: { task },
      message: 'Task created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateTaskSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found' },
      });
    }

    const { title, description, completed, priority, dueDate, categoryId } = value;

    // Verify category belongs to user if provided
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          userId: req.user!.id,
        },
      });

      if (!category) {
        return res.status(400).json({
          success: false,
          error: { message: 'Category not found or does not belong to user' },
        });
      }
    }

    // Update task
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(completed !== undefined && { completed }),
        ...(priority !== undefined && { priority: priority as string }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(categoryId !== undefined && { categoryId }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Emit WebSocket event for real-time updates
    wsService.emitTaskUpdated(req.user!.id, task);

    res.status(200).json({
      success: true,
      data: { task },
      message: 'Task updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: req.user!.id,
      },
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found' },
      });
    }

    // Delete task
    await prisma.task.delete({
      where: { id },
    });

    // Emit WebSocket event for real-time updates
    wsService.emitTaskDeleted(req.user!.id, id);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Bulk update tasks (mark multiple as completed/incomplete)
router.patch('/bulk', async (req: AuthRequest, res, next) => {
  try {
    const { taskIds, completed } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'taskIds must be a non-empty array' },
      });
    }

    if (typeof completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { message: 'completed must be a boolean value' },
      });
    }

    // Update tasks that belong to the user
    const result = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        userId: req.user!.id,
      },
      data: { completed },
    });

    // Get updated tasks for WebSocket emission
    const updatedTasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId: req.user!.id,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Emit WebSocket event for bulk update
    wsService.emitTaskBulkUpdate(req.user!.id, updatedTasks);

    res.status(200).json({
      success: true,
      data: { updatedCount: result.count },
      message: `${result.count} tasks updated successfully`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
