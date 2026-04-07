const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { getAllowedOrigins } = require("./config/clientOrigins");

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  const onlineUsersByOrg = new Map();
  const activeProjectViewers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (_error) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    socket.on("join_org", ({ userId, orgId }) => {
      if (userId && orgId) {
        socket.join(`org_${orgId}`);
        socket.userId = userId;
        socket.orgId = orgId;

        if (!onlineUsersByOrg.has(orgId)) {
          onlineUsersByOrg.set(orgId, new Set());
        }

        onlineUsersByOrg.get(orgId).add(userId);

        io.to(`org_${orgId}`).emit(
          "get_online_users",
          Array.from(onlineUsersByOrg.get(orgId)),
        );
      }
    });

    socket.on("join_project", (data) => {
      const projectId = typeof data === "string" ? data : data.projectId;
      const user = typeof data === "object" ? data.user : null;

      if (projectId) {
        socket.join(`project_${projectId}`);
        socket.currentProjectId = projectId;
        console.log(`User ${socket.id} joined project room: project_${projectId}`);

        if (user) {
          socket.userProfile = user;

          if (!activeProjectViewers.has(projectId)) {
            activeProjectViewers.set(projectId, new Map());
          }

          const projectViewers = activeProjectViewers.get(projectId);
          projectViewers.set(socket.id, user);

          io.to(`project_${projectId}`).emit(
            "active_project_viewers",
            Array.from(projectViewers.values()),
          );
        }
      }
    });

    socket.on("leave_project", (projectId) => {
      if (projectId) {
        socket.leave(`project_${projectId}`);
        console.log(`User ${socket.id} left project room: project_${projectId}`);

        if (activeProjectViewers.has(projectId)) {
          const projectViewers = activeProjectViewers.get(projectId);
          projectViewers.delete(socket.id);

          io.to(`project_${projectId}`).emit(
            "active_project_viewers",
            Array.from(projectViewers.values()),
          );

          if (projectViewers.size === 0) {
            activeProjectViewers.delete(projectId);
          }
        }
      }
    });

    socket.on("join_task", (taskId) => {
      if (taskId) {
        socket.join(`task_${taskId}`);
        socket.currentTaskId = taskId;
      }
    });

    socket.on("leave_task", (taskId) => {
      if (taskId) {
        socket.leave(`task_${taskId}`);
        socket.to(`task_${taskId}`).emit("user_stopped_typing", { userId: socket.userId });
      }
    });

    socket.on("typing_comment", (data) => {
      const { taskId, user } = data;
      if (taskId && user) {
        socket.to(`task_${taskId}`).emit("user_typing", { user, taskId });
      }
    });

    socket.on("stopped_typing_comment", (data) => {
      const { taskId, userId } = data;
      if (taskId && userId) {
        socket.to(`task_${taskId}`).emit("user_stopped_typing", { userId, taskId });
      }
    });

    socket.on("join_user_room", (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`User ${socket.id} joined private room: user_${userId}`);
      }
    });

    socket.on("task_moved", (data) => {
      socket.to(`project_${data.projectId}`).emit("receive_task_update", data);
    });

    socket.on("new_comment", (data) => {
      socket.to(`project_${data.projectId}`).emit("receive_new_comment", data.comment);
    });

    socket.on("task_created", (data) => {
      socket.to(`project_${data.projectId}`).emit("receive_new_task", data.task);
    });

    socket.on("task_deleted", (data) => {
      socket.to(`project_${data.projectId}`).emit("receive_task_deleted", { _id: data._id });
    });

    socket.on("disconnect", () => {
      console.log("User Disconnected", socket.id);

      if (socket.currentProjectId && socket.userProfile) {
        const projectId = socket.currentProjectId;
        if (activeProjectViewers.has(projectId)) {
          const projectViewers = activeProjectViewers.get(projectId);
          projectViewers.delete(socket.id);

          io.to(`project_${projectId}`).emit(
            "active_project_viewers",
            Array.from(projectViewers.values()),
          );

          if (projectViewers.size === 0) {
            activeProjectViewers.delete(projectId);
          }
        }
      }

      if (socket.orgId && socket.userId) {
        const orgUsers = onlineUsersByOrg.get(socket.orgId);
        if (orgUsers) {
          orgUsers.delete(socket.userId);

          io.to(`org_${socket.orgId}`).emit(
            "get_online_users",
            Array.from(orgUsers),
          );

          if (orgUsers.size === 0) {
            onlineUsersByOrg.delete(socket.orgId);
          }
        }
      }
    });
  });

  return io;
};

module.exports = { createSocketServer };
