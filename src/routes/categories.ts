import express from 'express';
import { prisma } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createCategorySchema, updateCategorySchema } from '../utils/validation';

const router = express.Router();
router.use(authenticate);

// Get all categories for user
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tasks: true } } },
    });

    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = createCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const category = await prisma.category.create({
      data: { ...value, userId: req.user!.id },
    });

    res.status(201).json({
      success: true,
      data: { category },
      message: 'Category created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Update category
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { error, value } = updateCategorySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: { message: error.details[0].message },
      });
    }

    const category = await prisma.category.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: value,
    });

    if (category.count === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found' },
      });
    }

    const updatedCategory = await prisma.category.findUnique({
      where: { id: req.params.id },
    });

    res.status(200).json({
      success: true,
      data: { category: updatedCategory },
      message: 'Category updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await prisma.category.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found' },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
