const WINDOW_SIZE = 500;

const requests = [];
const emailDeliveries = [];

const recordRequestMetric = ({ method, path, statusCode, durationMs }) => {
  requests.push({
    method,
    path,
    statusCode,
    durationMs,
    at: new Date(),
  });
  if (requests.length > WINDOW_SIZE) requests.shift();
};

const recordEmailDelivery = ({ status, subject, to, error }) => {
  emailDeliveries.push({
    status,
    subject,
    to,
    error,
    at: new Date(),
  });
  if (emailDeliveries.length > 100) emailDeliveries.shift();
};

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
};

const getRequestSummary = () => {
  const total = requests.length;
  const errors = requests.filter((entry) => entry.statusCode >= 500).length;
  const durations = requests.map((entry) => entry.durationMs);

  return {
    sampleSize: total,
    errorRate: total ? Number(((errors / total) * 100).toFixed(2)) : 0,
    averageResponseMs: total
      ? Number((durations.reduce((sum, value) => sum + value, 0) / total).toFixed(1))
      : 0,
    p95ResponseMs: Number(percentile(durations, 95).toFixed(1)),
    recentErrors: requests
      .filter((entry) => entry.statusCode >= 500)
      .slice(-5)
      .reverse(),
  };
};

const getEmailSummary = () => {
  const total = emailDeliveries.length;
  const failed = emailDeliveries.filter((entry) => entry.status === 'failed').length;

  return {
    configured: Boolean(process.env.RESEND_API_KEY && process.env.FROM_EMAIL),
    sampleSize: total,
    failureRate: total ? Number(((failed / total) * 100).toFixed(2)) : 0,
    lastDelivery: emailDeliveries[emailDeliveries.length - 1] || null,
  };
};

module.exports = {
  recordRequestMetric,
  recordEmailDelivery,
  getRequestSummary,
  getEmailSummary,
};
