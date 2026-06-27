const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const passport = require("passport");
const errorHandler = require("./middleware/errorHandler");
const { getAllowedOrigins } = require("./config/clientOrigins");

require("./config/passport");

const userRoutes = require("./routes/userRoutes");
const organizationRoutes = require("./domains/organizations/routes");
const projectRoutes = require("./domains/projects/routes");
const taskRoutes = require("./domains/tasks/routes");
const commentRoutes = require("./domains/comments/routes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./domains/notifications/routes");
const activityRoutes = require("./routes/activityRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const formRoutes = require("./routes/formRoutes");
const automationRoutes = require("./routes/automationRoutes");
const searchRoutes = require("./routes/searchRoutes");
const filterPresetRoutes = require("./routes/filterPresetRoutes");
const adminRoutes = require("./routes/adminRoutes");
const inviteRoutes = require("./domains/invites/routes");
const reminderRoutes = require("./routes/reminderRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const aiRoutes = require("./routes/aiRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const goalRoutes = require("./routes/goalRoutes");
const { recordRequestMetric } = require("./utils/opsMetrics");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many write operations, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "AI rate limit reached. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);
  app.set("io", null);

  app.use(helmet());
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    cors({
      origin: getAllowedOrigins(),
      credentials: true,
    }),
  );

  app.use("/api", generalLimiter);
  app.use("/api/users/login", authLimiter);
  app.use("/api/users/register", authLimiter);
  app.use("/api/comments", writeLimiter);

  app.use(passport.initialize());

  app.use((req, _res, next) => {
    req.io = req.app.get("io");
    next();
  });

  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      recordRequestMetric({
        method: req.method,
        path: req.route?.path || req.path,
        statusCode: res.statusCode,
        durationMs,
      });
    });
    next();
  });

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
  app.use("/api/announcements", announcementRoutes);
  app.use("/api/portfolios", portfolioRoutes);
  app.use("/api/goals", goalRoutes);
  app.use("/api/ai", aiLimiter, aiRoutes);

  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
