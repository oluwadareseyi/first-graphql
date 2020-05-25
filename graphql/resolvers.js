const bcrypt = require("bcryptjs");
const validator = require("validator");
const User = require("../models/user");
const errorHandler = require("../util/error");

module.exports = {
  // use the createUser mutation to create a new user
  /**
   * @function createUser - creates a new user from the GraphQL schema.
   * @param  {} {userInput} - destructured from all the arguments (args) that is
   *                          passed into the createUser.
   * @param  {} req the request body.
   * @returns {JSON} - Returns the user in JSON format.
   */
  createUser: async ({ userInput }, req) => {
    // get the data from the userInput object.
    const { email, password, name } = userInput;

    // let's perform some validation.
    !validator.isEmail(email) && errorHandler("Invalid Email", 422);

    validator.isEmpty(password) ||
      (!validator.isLength(password, { min: 5 }) &&
        errorHandler("Password must be at least 5 characters", 422));

    const exitingUser = await User.findOne({ email });

    // is user already exists, throw an error.
    exitingUser && errorHandler("User already exists!", 403);

    // hash the password.
    const hashedPw = await bcrypt.hash(password, 12);

    // create a new User object
    const user = new User({
      email,
      name,
      password: hashedPw,
    });

    const createdUser = await user.save();

    return { ...createdUser._doc, id_: createdUser._id.toString() };
  },
};
