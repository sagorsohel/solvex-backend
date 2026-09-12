# Solvex Backend API (Express.js + JWT + Drizzle ORM + MySQL)

Modern, secure, and production-ready Express.js backend.

## Tech Stack
- **Runtime & Framework**: Node.js & Express.js with TypeScript
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing
- **ORM & DB Tooling**: Drizzle ORM & Drizzle Kit
- **Database**: MySQL (`mysql2` driver)

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Check `.env` file and adjust MySQL database credentials if needed:
```env
PORT=5000
JWT_SECRET=super_secret_jwt_key_solvex_2026_change_in_production
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=solvex_db
```

### 3. Database Migration & Seeding
Create the database `solvex_db` in MySQL / phpMyAdmin / WAMP, then:
```bash
# Push Drizzle schema to MySQL
npm run db:push

# Seed default Super Admin user (admin@solvex.com / admin123)
npm run db:seed
```

### 4. Start Server
```bash
# Development mode with hot reload
npm run dev

# Build TypeScript to dist
npm run build

# Start production server
npm start
```

## API Endpoints
- `GET /api/health` - Service health status
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login & receive JWT token
- `GET /api/auth/me` - Get profile of authenticated user
- `GET /api/dashboard/stats` - Admin metrics & activity logs
- `GET /api/users` - List all users (JWT protected)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)
