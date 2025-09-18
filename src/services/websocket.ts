import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware for WebSocket connections
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        
        // Verify user exists in database
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId }
        });

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        socket.userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected via WebSocket`);

      // Add user to connected users map
      if (socket.userId) {
        if (!this.connectedUsers.has(socket.userId)) {
          this.connectedUsers.set(socket.userId, new Set());
        }
        this.connectedUsers.get(socket.userId)!.add(socket.id);

        // Join user to their personal room
        socket.join(`user:${socket.userId}`);
      }

      // Handle task subscription
      socket.on('subscribe:tasks', () => {
        if (socket.userId) {
          socket.join(`tasks:${socket.userId}`);
          console.log(`User ${socket.userId} subscribed to task updates`);
        }
      });

      // Handle category subscription
      socket.on('subscribe:categories', () => {
        if (socket.userId) {
          socket.join(`categories:${socket.userId}`);
          console.log(`User ${socket.userId} subscribed to category updates`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected from WebSocket`);
        
        if (socket.userId) {
          const userSockets = this.connectedUsers.get(socket.userId);
          if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
              this.connectedUsers.delete(socket.userId);
            }
          }
        }
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  // Emit task events
  public emitTaskCreated(userId: string, task: any) {
    this.io.to(`tasks:${userId}`).emit('task:created', task);
  }

  public emitTaskUpdated(userId: string, task: any) {
    this.io.to(`tasks:${userId}`).emit('task:updated', task);
  }

  public emitTaskDeleted(userId: string, taskId: string) {
    this.io.to(`tasks:${userId}`).emit('task:deleted', { id: taskId });
  }

  public emitTaskBulkUpdate(userId: string, tasks: any[]) {
    this.io.to(`tasks:${userId}`).emit('tasks:bulk_updated', tasks);
  }

  // Emit category events
  public emitCategoryCreated(userId: string, category: any) {
    this.io.to(`categories:${userId}`).emit('category:created', category);
  }

  public emitCategoryUpdated(userId: string, category: any) {
    this.io.to(`categories:${userId}`).emit('category:updated', category);
  }

  public emitCategoryDeleted(userId: string, categoryId: string) {
    this.io.to(`categories:${userId}`).emit('category:deleted', { id: categoryId });
  }

  // Emit notification events
  public emitNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  // Get connected users count
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Check if user is connected
  public isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get Socket.IO instance for advanced usage
  public getIO(): SocketIOServer {
    return this.io;
  }
}

export default WebSocketService;
