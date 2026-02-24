<div align="center">
  <img src="client/public/favicon.ico" alt="TaskKollecta Logo" width="80" height="80" />
  <h1>TaskKollecta</h1>
  <p><strong>A modern, premium task management and collaboration platform</strong></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#environment-variables">Env Variables</a>
  </p>
</div>

---

TaskKollecta is a full-featured, real-time project management tool built with the MERN stack. Designed with a focus on UI polish, "glassmorphism" aesthetics, and seamless user experience, it offers Kanban boards, Gantt charts, real-time collaboration, and an extendable automation engine.

## ✨ Features

### Workspace & Organization

- **Multi-Organization Support:** Create and seamlessly switch between different workspaces.
- **Premium Dashboard:** Glassmorphism stat cards, animated counters, user growth charts, and productivity tracking.
- **Project Management:** Organize work into projects with cover colors, rich descriptions, and team assignments.

### Task Management

- **Interactive Kanban Board:** Drag-and-drop tasks with smooth framer-motion animations and glowing drop-zones.
- **Gantt / Timeline View:** Visualize project schedules, dependencies, and overlapping tasks.
- **Rich Task Details:** Subtasks, file attachments, rich-text markdown comments, recurring tasks, and tagging.
- **Bulk Actions:** Select multiple tasks to update status, priority, or delete simultaneously.

### Collaboration & Real-Time Sync

- **WebSockets Integration:** Instant UI updates when team members move tasks or leave comments (no refreshing needed).
- **Role-Based Access Control:** Superadmin, Admin, and User roles.
- **Notifications:** Real-time in-app notification center for mentions, assignments, and due dates.

### Advanced Features

- **Automation Engine:** "If This, Then That" rules (e.g., _When task becomes overdue → Change priority to Urgent + Notify Assignee_).
- **Analytics & Reports:** Workload distribution, sprint velocity, and task completion trends using Recharts.
- **Theme Support:** Native Light/Dark mode with seamless transitions.
- **SuperAdmin Panel:** System health monitoring, platform-wide user analytics, and organization leaderboard.

## 🛠 Tech Stack

**Frontend (Client)**

- **Core:** React 19, Vite, React Router v7
- **Styling:** Tailwind CSS, Shadcn UI, Class Variance Authority
- **Animations:** Framer Motion, Tailwind Animate
- **State & Data:** Axios
- **Specialized UI:** `@dnd-kit` (drag and drop), `recharts` (charts), `react-big-calendar` (calendar)

**Backend (Server)**

- **Core:** Node.js, Express.js
- **Database:** MongoDB (Mongoose), Redis (Caching & Job Queues)
- **Real-time:** Socket.IO
- **Auth:** JWT, Passport.js (Google/Microsoft OAuth support)
- **Storage & Email:** Cloudinary (Attachments/Avatars), Nodemailer/Resend

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB database (local or Atlas)
- Redis server (Upstash or local)
- Cloudinary account (for image uploads)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/TaskKollecta.git
cd TaskKollecta
```

### 2. Install Dependencies

You need to install packages for both the backend and frontend.

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the `server` directory and populate it with your credentials (see [Environment Variables](#environment-variables) section below).

Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Run the Application

Start both the backend and frontend servers:

**Terminal 1 (Backend):**

```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**

```bash
cd client
npm run dev
```

The application will be available at `http://localhost:5173`.

## ⚙️ Environment Variables (Server)

Create a `.env` file in the `server/` root:

```env
# Server config
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/taskkollecta

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d

# OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_ms_client_id
MICROSOFT_CLIENT_SECRET=your_ms_client_secret

# Redis (For caching)
REDIS_URL=redis://default:password@your-redis-instance:6379

# Cloudinary (For Avatars & Attachments)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email / SMTP (Nodemailer / Resend)
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
