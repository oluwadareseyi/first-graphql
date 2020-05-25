/**
 * @function errorHandler
 * @param  {String} message - The error message.
 * @param  {Number} code - The status code.
 * @param  {any} data  - Any other data we wish to pass (defaults to null)
 */
module.exports = (message, code, data = null) => {
  const error = new Error(message);
  error.code = code;
  error.data = data;
  throw error;
};
