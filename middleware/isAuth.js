const jwt = require("jsonwebtoken");
const errorHandler = require("../util/error");

module.exports = async (req, res, next) => {
  const token = req.get("Authorization");
  let decodedToken;

  try {
    decodedToken = jwt.verify(token, "secretdonttellanyone");
  } catch (error) {
    error.statusCode = 500;
    throw error;
  }

  if (!decodedToken) {
    errorHandler("Not Authenticated", 401);
  }

  req.userId = decodedToken.userId;
  next();
};
