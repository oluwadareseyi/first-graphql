const express = require("express");
const bodyparser = require("body-parser");
const morgan = require("morgan");
const cors = require("cors");
const app = express();
const port = 5000;
const path = require("path");
const { clearImage } = require("./util/file");
const { dbKey } = require("./util/keys");
const mongoose = require("mongoose");
const multer = require("multer");
const uuidv4 = require("uuid/v4");
const graphqlHttp = require("express-graphql");
const auth = require("./middleware/isAuth");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const errorHandler = require("./util/error");

app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (["image/png", "image.jpg", "image/jpeg"].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// file.mimetype === "image/png" ||
//     file.mimetype === "image/jpg" ||
//     file.mimetype === "image/jpeg"

app.use(bodyparser.json());
app.use(
  multer({
    storage: storage,
    fileFilter: fileFilter,
  }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

// app.use(express.json({ limit: "10kb" }));
// app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(auth);

app.put("/post-image", (req, res, next) => {
  !req.isAuth && errorHandler("Not Authenticated", 401);
  if (!req.file) {
    return res.status(200).json({ message: "No file provided!" });
  }

  let imageUrl;

  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }

  req.body.oldPath && clearImage(req.body.oldPath);

  return res.status(201).json({ message: "file stored", filePath: imageUrl });
});

app.put("/delete-image", (req, res, next) => {
  !req.isAuth && errorHandler("Not Authenticated", 401);
  clearImage(req.body.imagePath);
  next();
});
app.use(
  "/graphql",
  graphqlHttp({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An error occured";
      const code = err.originalError.code || 500;
      return { message, status: code, data };
    },
  })
);

app.use((error, req, res, next) => {
  // console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({
    message,
    data,
  });
});
// app.get("/", (req, res) => res.send({ title: "Hello World!" }));

mongoose
  .connect(dbKey, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(port, () => console.log(`app listening on port ${port}!`));
    console.log("database successfully connected");
  })
  .catch((err) => console.log(err));
