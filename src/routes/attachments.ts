import express from 'express';
import { prisma, wsService } from '../server';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload, deleteFile, getFileUrl } from '../services/upload';

const router = express.Router();
router.use(authenticate);

// Upload attachments to a task
router.post('/:taskId', upload.array('files', 5), async (req: AuthRequest, res, next) => {
  try {
    const { taskId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No files uploaded' },
      });
    }

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user!.id,
      },
    });

    if (!task) {
      // Clean up uploaded files if task not found
      for (const file of files) {
        await deleteFile(file.filename);
      }
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found' },
      });
    }

    // Create attachment records
    const attachments = await Promise.all(
      files.map(file =>
        prisma.attachment.create({
          data: {
            filename: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            url: getFileUrl(file.filename),
            taskId,
          },
        })
      )
    );

    res.status(201).json({
      success: true,
      data: { attachments },
      message: `${attachments.length} file(s) uploaded successfully`,
    });
  } catch (error) {
    // Clean up files on error
    const files = req.files as Express.Multer.File[];
    if (files) {
      for (const file of files) {
        await deleteFile(file.filename).catch(() => {});
      }
    }
    next(error);
  }
});

// Get attachments for a task
router.get('/:taskId', async (req: AuthRequest, res, next) => {
  try {
    const { taskId } = req.params;

    // Verify task belongs to user
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: req.user!.id,
      },
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: { message: 'Task not found' },
      });
    }

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: { attachments },
    });
  } catch (error) {
    next(error);
  }
});

// Delete attachment
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    // Find attachment and verify ownership through task
    const attachment = await prisma.attachment.findFirst({
      where: {
        id,
        task: {
          userId: req.user!.id,
        },
      },
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attachment not found' },
      });
    }

    // Delete file from filesystem
    await deleteFile(attachment.filename);

    // Delete attachment record
    await prisma.attachment.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
