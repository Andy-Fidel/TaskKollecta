const getAllowedOrigins = () => [
  "http://localhost:5173",
  "https://task-kollecta.vercel.app",
  "https://www.taskkollecta.com",
  "https://taskkollecta.com",
  process.env.CLIENT_URL,
].filter(Boolean);

module.exports = { getAllowedOrigins };
