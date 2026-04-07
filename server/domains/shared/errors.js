const createDomainError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const handleDomainError = (res, error) => {
  res.status(error.status || 500).json({ message: error.message });
};

module.exports = {
  createDomainError,
  handleDomainError,
};
