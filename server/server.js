const dotenv = require("dotenv");
const http = require("http");
const connectDB = require("./config/db");
const { createApp } = require("./app");
const { createSocketServer } = require("./socket");

dotenv.config();
if (process.env.NODE_ENV !== "test") {
  connectDB();
}

const app = createApp();
const server = http.createServer(app);
const io = createSocketServer(server);
app.set("io", io);

const PORT = process.env.PORT || 5000;

// IMPORTANT: Change app.listen to server.listen
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start the overdue task automation scheduler (runs hourly)
    const { startOverdueScheduler } = require("./utils/overdueScheduler");
    startOverdueScheduler(io);
  });
}
module.exports = { app, server, io };
