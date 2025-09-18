import Joi from 'joi';

// User validation schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username cannot exceed 30 characters',
    'any.required': 'Username is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  firstName: Joi.string().max(50).optional(),
  lastName: Joi.string().max(50).optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// Task validation schemas
export const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Task title cannot be empty',
    'string.max': 'Task title cannot exceed 200 characters',
    'any.required': 'Task title is required',
  }),
  description: Joi.string().max(1000).optional().allow(''),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM'),
  dueDate: Joi.date().iso().optional().allow(null),
  categoryId: Joi.string().optional().allow(null),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  completed: Joi.boolean().optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  dueDate: Joi.date().iso().optional().allow(null),
  categoryId: Joi.string().optional().allow(null),
});

// Category validation schemas
export const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(50).required().messages({
    'string.min': 'Category name cannot be empty',
    'string.max': 'Category name cannot exceed 50 characters',
    'any.required': 'Category name is required',
  }),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#3B82F6').messages({
    'string.pattern.base': 'Color must be a valid hex color code (e.g., #3B82F6)',
  }),
  description: Joi.string().max(200).optional().allow(''),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(50).optional(),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  description: Joi.string().max(200).optional().allow(''),
});

// Query validation schemas
export const taskQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(100).optional(),
  completed: Joi.boolean().optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').optional(),
  categoryId: Joi.string().optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'dueDate', 'title', 'priority').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});
