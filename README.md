# TaskMaster Backend API

A robust REST API for task management with user authentication, categories, and full CRUD operations. Built with Node.js, Express, TypeScript, and PostgreSQL.

## 🚀 Features

- **User Authentication**: JWT-based registration and login
- **Task Management**: Full CRUD operations with filtering, sorting, and pagination
- **Categories**: Organize tasks with custom categories and colors
- **Data Validation**: Comprehensive input validation with Joi
- **Security**: Rate limiting, CORS, helmet security headers
- **Database**: PostgreSQL with Prisma ORM
- **TypeScript**: Full type safety throughout the application

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Tasks
- `GET /api/tasks` - Get tasks with filtering and pagination
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/bulk` - Bulk update tasks

### Categories
- `GET /api/categories` - Get user categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd TaskMaster-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/taskmaster_db"
   JWT_SECRET="your-super-secret-jwt-key-here"
   PORT=3000
   NODE_ENV="development"
   ```

4. **Set up the database:**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/
├── middleware/          # Express middleware
│   ├── auth.ts         # JWT authentication
│   ├── errorHandler.ts # Global error handling
│   └── notFound.ts     # 404 handler
├── routes/             # API route handlers
│   ├── auth.ts         # Authentication routes
│   ├── tasks.ts        # Task management routes
│   └── categories.ts   # Category routes
├── utils/              # Utility functions
│   └── validation.ts   # Joi validation schemas
└── server.ts           # Main application entry point
```

## 📊 Database Schema

### Users
- id, email, username, password
- firstName, lastName (optional)
- createdAt, updatedAt

### Tasks
- id, title, description (optional)
- completed (boolean), priority (enum)
- dueDate (optional), categoryId (optional)
- userId (foreign key)

### Categories
- id, name, color, description (optional)
- userId (foreign key)

## 🔒 Authentication

All task and category endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📝 API Usage Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "johndoe",
    "password": "securepassword",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive README and API docs",
    "priority": "HIGH",
    "dueDate": "2024-01-15T10:00:00Z"
  }'
```

### Get Tasks with Filtering
```bash
curl "http://localhost:3000/api/tasks?completed=false&priority=HIGH&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

## 🚀 Deployment

The application is ready for deployment to platforms like:
- Railway
- Heroku
- DigitalOcean App Platform
- AWS Elastic Beanstalk

Make sure to:
1. Set production environment variables
2. Use a production PostgreSQL database
3. Set `NODE_ENV=production`

## 🧪 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run db:migrate   # Run database migrations
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio
```

## 🔧 Technologies Used

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Development**: Nodemon, ESLint

## 📄 License

MIT License - see LICENSE file for details.
