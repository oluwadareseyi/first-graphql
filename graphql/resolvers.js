const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Post = require("../models/post");
const errorHandler = require("../util/error");
const { clearImage } = require("../util/file");

module.exports = {
  // use the createUser mutation to create a new user
  /**
   * @function createUser - creates a new user from the GraphQL schema.
   * @param  {} {userInput} - destructured from all the arguments (args) that is
   *                          passed into the createUser.
   * @param  {} req the request body.
   * @returns {Object} - Returns the user object which we can take any piece of in our front-end query.
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

  login: async ({ email, password }) => {
    // validation.
    !validator.isEmail(email) && errorHandler("Invalid Email", 422);
    validator.isEmpty(password) ||
      (!validator.isLength(password, { min: 5 }) &&
        errorHandler("Password must be at least 5 characters", 422));

    // check if user is in DB.
    const user = await User.findOne({ email });
    !user && errorHandler("User with this email address does not exist", 401);

    // check if password is correct.
    const isEqual = await bcrypt.compare(password, user.password);
    !isEqual && errorHandler("incorrect password", 401);

    // if both email and password checks out, generate webtoken
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      "secretdonttellanyone",
      { expiresIn: "1h" }
    );

    return { token, userId: user._id.toString() };
  },

  createPost: async ({ postInput }, req) => {
    !req.isAuth && errorHandler("Not Authenticated", 401);
    const { title, content, imageUrl } = postInput;
    !validator.isLength(title, { min: 5 }) &&
      errorHandler("title must contain at least 5 characters", 422);
    !validator.isLength(content, { min: 5 }) &&
      errorHandler("content must contain at least 5 characters", 422);

    const user = await User.findById(req.userId);
    !user && errorHandler("Invalid User", 401);
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: user,
    });

    const createdPost = await post.save();
    user.posts.push(createdPost);
    await user.save();

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },

  posts: async ({ page }, req) => {
    !req.isAuth && errorHandler("Not Authenticated", 401);

    if (!page) {
      page = 1;
    }

    const perPage = 2;
    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate("creator");
    return {
      message: "posts retrieved successfully",
      posts: posts.map((post) => {
        return {
          ...post._doc,
          _id: post._id.toString(),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        };
      }),
      totalPosts,
    };
  },

  post: async ({ postId }, req) => {
    !req.isAuth && errorHandler("Not Authenticated", 401);
    const post = await Post.findById(postId).populate("creator");

    !post && errorHandler("No post found", 404);

    return {
      ...post._doc,
      _id: post.id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },

  updatePost: async ({ postId, postInput }, req) => {
    !req.isAuth && errorHandler("Not Authenticated", 401);
    const post = await Post.findById(postId).populate("creator");
    !post && errorHandler("No post found", 404);

    // check if the user id we get from the authorization header sent from the front end matchs the ID of the creator. If false, we know the creator is not the owner of the post being edited.
    post.creator._id.toString() !== req.userId.toString() &&
      errorHandler("Not authorized", 401);

    const { title, content, imageUrl } = postInput;

    !validator.isLength(title, { min: 5 }) &&
      errorHandler("title must contain at least 5 characters", 422);
    !validator.isLength(content, { min: 5 }) &&
      errorHandler("content must contain at least 5 characters", 422);

    post.title = title;
    post.content = content;
    if (imageUrl !== "undefined") {
      post.imageUrl = imageUrl;
    }

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost.id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },

  deletePost: async ({ postId }, req) => {
    !req.isAuth && errorHandler("Not Authenticated", 401);
    const post = await await Post.findById(postId);
    !post && errorHandler("No post found", 404);
    post.creator.toString() !== req.userId.toString() &&
      errorHandler("Not authorized", 401);
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    return true;
  },

  status: async (_, req) => {
    !req.isAuth && errorHandler("Not Authenticated", 401);
    const user = await User.findById(req.userId);
    return user.status;
  },

  updateStatus: async ({ statusInput }, req) => {
    !req.isAuth && errorHandler("Not Authenticated", 401);
    const user = await User.findById(req.userId);
    user.status = statusInput;
    const updatedUser = await user.save();
    return updatedUser.status;
  },
};
