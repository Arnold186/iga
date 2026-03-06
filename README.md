## IGA LMS

IGA is a production-ready online Learning Management System built with:

- **Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL, Socket.io, Nodemailer, JWT, bcrypt, Zod
- **Frontend**: React, TypeScript, Vite, React Router, Axios, Socket.io client, React Hook Form, Zod, React Toastify

### Project structure

- `backend/` – REST API, authentication, quizzes, chat, admin analytics
- `frontend/` – React SPA with role-based dashboards and realtime chat

### Prerequisites

- Node.js 18+
- Local PostgreSQL instance

### Backend setup

1. Go to backend:

   ```bash
   cd backend
   ```

2. Create `.env` from the example and adjust values (database, JWT secret, SMTP, frontend URL):

   ```bash
   copy .env.example .env   # on Windows PowerShell: cp .env.example .env
   ```

3. Create a PostgreSQL database and user that match `DATABASE_URL` in `.env`, for example:

   ```text
   DATABASE_URL="postgresql://iga_user:iga_password@localhost:5432/iga_db?schema=public"
   ```

4. Run Prisma migrations and generate the client:

   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. Install dependencies (if not already):

   ```bash
   npm install
   ```

6. Start the backend in dev mode:

   ```bash
   npm run dev
   ```

   Backend runs on `http://localhost:4010`.

### Frontend setup

1. Go to frontend:

   ```bash
   cd frontend
   ```

2. Ensure dependencies are installed:

   ```bash
   npm install
   ```

3. Start the Vite dev server:

   ```bash
   npm run dev
   ```

   Frontend runs on `http://localhost:5173` by default.

### Environment variables (backend)

See `backend/.env.example`:

- `PORT` – backend port (default `4010`)
- `DATABASE_URL` – PostgreSQL connection string
- `JWT_SECRET` – strong JWT signing secret
- `JWT_EXPIRES_IN` – JWT expiry, e.g. `7d`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` – SMTP for OTP and password reset emails
- `FRONTEND_URL` – frontend origin (e.g. `http://localhost:5173`)

### High-level features

- **Authentication**
  - Registration with role (Student/Teacher/Admin), email/password
  - 6-digit email OTP verification (5-minute expiry) via Nodemailer
  - JWT-based login, role-based authorization middleware
  - Forgot password with email reset token and password reset endpoint
  - Passwords hashed with bcrypt

- **Role-based dashboards**
  - Student: My Courses, Available Courses, My Grades, Chat
  - Teacher: My Courses, Create Course, Create Quiz, basic quiz management, Chat
  - Admin: Pending Courses, User Management, Analytics (students, courses, average performance), Chat

- **Courses / Quizzes / Grading**
  - Teachers create courses (initially `PENDING`)
  - Admins approve/reject courses
  - Students see only `APPROVED` courses and can enroll
  - Teachers create quizzes and questions, publish quizzes
  - Students submit quizzes, auto-graded on the backend, scores stored and visible immediately

- **Chat**
  - Socket.io-based group chat for all logged-in users (admin announcements supported)
  - Messages stored in PostgreSQL; simple private messaging support on the backend

