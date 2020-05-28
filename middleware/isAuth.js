const jwt = require("jsonwebtoken");
// const errorHandler = require("../util/error");

module.exports = async (req, res, next) => {
  const token = req.get("Authorization");
  let decodedToken;

  if (!token) {
    req.isAuth = false;
    return next();
  }

  try {
    decodedToken = jwt.verify(token, "secretdonttellanyone");
  } catch (error) {
    req.isAuth = false;
    return next();
  }

  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }

  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
