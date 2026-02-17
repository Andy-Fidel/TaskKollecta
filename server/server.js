const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const passport = require("passport");
const errorHandler = require("./middleware/errorHandler");

// Routes
const userRoutes = require("./routes/userRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const projectRoutes = require("./routes/projectRoutes");
const taskRoutes = require("./routes/taskRoutes");
const commentRoutes = require("./routes/commentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const activityRoutes = require("./routes/activityRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const formRoutes = require("./routes/formRoutes");
const passportConfig = require("./config/passport");
const automationRoutes = require("./routes/automationRoutes");
const searchRoutes = require("./routes/searchRoutes");
const filterPresetRoutes = require("./routes/filterPresetRoutes");
const adminRoutes = require("./routes/adminRoutes");
const inviteRoutes = require("./routes/inviteRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

// Load environment variables

dotenv.config();
connectDB();

const app = express();

app.set("trust proxy", 1);

// --- RATE LIMITERS ---
// General API rate limiter: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth routes: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for write operations: 30 requests per minute
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { message: "Too many write operations, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// SECURITY: HTTP security headers
app.use(helmet());

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Local development
      "https://task-kollecta.vercel.app", // Vercel deployment
      "https://www.taskkollecta.com", // Custom domain (www)
      "https://taskkollecta.com", // Custom domain (root)
      process.env.CLIENT_URL, // Fallback from env
    ],
    credentials: true,
  }),
);

// Apply general rate limiter to all API routes
app.use("/api", generalLimiter);

// Apply stricter limiters to specific routes
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);
app.use("/api/comments", writeLimiter);

app.use(passport.initialize());
passportConfig;

// --- SOCKET.IO SETUP START ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://task-kollecta.vercel.app",
      "https://www.taskkollecta.com",
      "https://taskkollecta.com",
      process.env.CLIENT_URL,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Global Map to track online users per organization
let onlineUsersByOrg = new Map(); // orgId -> Set of userIds

// Socket.io authentication middleware (M7)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // --- 1. ORGANIZATION-BASED PRESENCE ---
  socket.on("join_org", ({ userId, orgId }) => {
    if (userId && orgId) {
      socket.join(`org_${orgId}`);
      socket.userId = userId;
      socket.orgId = orgId;

      // Track online users per org
      if (!onlineUsersByOrg.has(orgId)) {
        onlineUsersByOrg.set(orgId, new Set());
      }
      onlineUsersByOrg.get(orgId).add(userId);

      // Broadcast to org room only (not globally!)
      io.to(`org_${orgId}`).emit(
        "get_online_users",
        Array.from(onlineUsersByOrg.get(orgId)),
      );
    }
  });

  // --- 2. PROJECT ROOM MANAGEMENT ---
  socket.on("join_project", (projectId) => {
    if (projectId) {
      socket.join(`project_${projectId}`);
      socket.currentProjectId = projectId;
      console.log(
        `User ${socket.id} joined project room: project_${projectId}`,
      );
    }
  });

  socket.on("leave_project", (projectId) => {
    if (projectId) {
      socket.leave(`project_${projectId}`);
      console.log(`User ${socket.id} left project room: project_${projectId}`);
    }
  });

  // --- 3. USER ROOM (for private notifications) ---
  socket.on("join_user_room", (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User ${socket.id} joined private room: user_${userId}`);
    }
  });

  // --- 4. TASK UPDATES (PROJECT-SCOPED) ---
  socket.on("task_moved", (data) => {
    // Broadcast to project room only
    socket.to(`project_${data.projectId}`).emit("receive_task_update", data);
  });

  socket.on("new_comment", (data) => {
    // Broadcast to project room only
    socket
      .to(`project_${data.projectId}`)
      .emit("receive_new_comment", data.comment);
  });

  socket.on("task_created", (data) => {
    // Notify others in the project
    socket.to(`project_${data.projectId}`).emit("receive_new_task", data.task);
  });

  socket.on("task_deleted", (data) => {
    // Notify others in the project
    socket.to(`project_${data.projectId}`).emit("receive_task_deleted", { _id: data._id });
  });

  // --- 5. DISCONNECT (Clean up rooms and presence) ---
  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);

    // Remove from online users tracking
    if (socket.orgId && socket.userId) {
      const orgUsers = onlineUsersByOrg.get(socket.orgId);
      if (orgUsers) {
        orgUsers.delete(socket.userId);
        // Notify remaining org members
        io.to(`org_${socket.orgId}`).emit(
          "get_online_users",
          Array.from(orgUsers),
        );

        // Clean up empty sets
        if (orgUsers.size === 0) {
          onlineUsersByOrg.delete(socket.orgId);
        }
      }
    }
  });
});

// --- SOCKET.IO SETUP END ---

// Make io accessible in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount Routes
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/automations", automationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/filter-presets", filterPresetRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/analytics", analyticsRoutes);

// SECURITY: Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// IMPORTANT: Change app.listen to server.listen
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = { app, server, io };
