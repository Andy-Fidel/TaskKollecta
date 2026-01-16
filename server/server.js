const express = require("express");
const cookieParser = require('cookie-parser');
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http"); 
const { Server } = require("socket.io"); 
const connectDB = require("./config/db");
const passport = require('passport');


// Routes
const userRoutes = require('./routes/userRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const activityRoutes = require('./routes/activityRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const formRoutes = require('./routes/formRoutes');
const passportConfig = require('./config/passport');
const automationRoutes = require('./routes/automationRoutes');

// Load environment variables

dotenv.config();
connectDB();

const app = express();

app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    "http://localhost:5173",              // Local development
    process.env.CLIENT_URL                // Production (Vercel URL)
  ],
  credentials: true
 }));
app.use(passport.initialize());
passportConfig; 

// --- SOCKET.IO SETUP START ---
const server = http.createServer(app); 
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://task-kollecta.vercel.app"
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Global Map to track online users (UserId -> SocketId)
let onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log("User Connected:", socket.id);

  // --- 1. ONLINE PRESENCE ---
  socket.on('join_app', (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      // Broadcast online list to EVERYONE
      io.emit('get_online_users', Array.from(onlineUsers.keys()));
    }
  });

  // --- 2. ROOM MANAGEMENT ---
  socket.on("join_project", (projectId) => {
    socket.join(projectId);
    console.log(`User ${socket.id} joined project: ${projectId}`);
  });

  socket.on("join_user_room", (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined private room: ${userId}`);
  });

  // --- 3. TASK UPDATES ---
  socket.on("task_moved", (data) => {
    // Broadcast to everyone ELSE in that project room
    socket.to(data.projectId).emit("receive_task_update", data);
  });

  socket.on("new_comment", (data) => {
    // Broadcast to everyone in the project
    socket.to(data.projectId).emit("receive_new_comment", data.comment);
  });

  // --- 4. DISCONNECT (Consolidated) ---
  socket.on('disconnect', () => {
    console.log("User Disconnected", socket.id);

    // Find userId by socketId and remove it from online list
    let disconnectedUser = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUser = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    
    // Send updated list to everyone if someone valid disconnected
    if (disconnectedUser) {
      io.emit('get_online_users', Array.from(onlineUsers.keys()));
    }
  });
});

// Make io accessible in your controllers (if you haven't already)
app.use((req, res, next) => {
    req.io = io;
    next();
});
// --- SOCKET.IO SETUP END ---

app.use((req, res, next) => {
  req.io = io;
    next();
});

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/automations', automationRoutes);



const PORT = process.env.PORT || 5000;

// IMPORTANT: Change app.listen to server.listen
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = {app, server, io};