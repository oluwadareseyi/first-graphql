module.exports = (message, statusCode, data = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.data = data;
  throw error;
};
