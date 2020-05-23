const Post = require("../models/post");
const User = require("../models/user");
const { validationResult } = require("express-validator");
const io = require("../socket");
const errorHandler = require("../util/error");
const fs = require("fs");
const path = require("path");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();

    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    res.status(200).json({
      message: "Fetched Posts",
      posts,
      totalItems,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      errorHandler("Could not find post", 404);
    }
    res.status(200).json({
      message: "Post retrieved successfully",
      post,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.createPost = async (req, res, next) => {
  const { title, content } = req.body;

  try {
    const errors = validationResult(req);

    if (req.file.path === undefined) {
      errorHandler("Please upload an image", 404);
    }
    const imageUrl = req.file.path.replace("\\", "/");

    if (!req.file) {
      errorHandler("Image not provided", 422);
    }

    if (!errors.isEmpty()) {
      clearImage(imageUrl);
      errorHandler("Please enter the correct data", 422);
    }

    const post = new Post({
      title,
      content,
      imageUrl,
      creator: req.userId,
    });

    const result = await post.save();
    const user = await User.findById(req.userId);
    // const creator = user;
    await user.posts.push(post);
    await user.save();
    const { _id, name } = user;
    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id, name } },
    });
    res.status(201).json({
      message: "Successfully created",
      post: result,
      creator: { _id, name },
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const { title, content } = req.body;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errorHandler("Please enter the correct data", 422);
    }
    let imageUrl = req.body.image;
    if (req.file) {
      imageUrl = req.file.path.replace("\\", "/");
    }

    if (!imageUrl) {
      errorHandler("no file picked", 422);
    }

    const post = await Post.findById(postId).populate("creator");

    if (!post) {
      errorHandler("no post found", 404);
    }

    if (post.creator._id.toString() !== req.userId) {
      errorHandler("Not Authorized", 403);
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;

    const updatedPost = await post.save();
    io.getIO().emit("posts", { action: "update", post: updatedPost });
    res.status(200).json({
      message: "Post created succesfully",
      post: updatedPost,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      errorHandler("Post not found", 422);
    }

    if (post.creator.toString() !== req.userId) {
      errorHandler("Not Authorized", 403);
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    await user.posts.pull(postId);
    await user.save();
    io.getIO().emit("posts", { action: "delete", post: postId });
    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const { status } = await User.findById(req.userId).select("status");
    if (!status) {
      errorHandler("Status not found", 404);
    }
    res.status(200).json({ status });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  const { status } = req.body;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      errorHandler("Not authorized", 422);
    }
    user.status = status;
    const result = await user.save();
    res.status(201).json({
      message: "Post updated!!",
      result: result.status,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};
