const express = require("express");
const morgan = require("morgan");
const connectDB = require("./config/db");
const bodyParser = require("body-parser");
const cors = require("cors");

// Config dotev...
require("dotenv").config({
  path: "./config/config.env",
});

const app = express();

connectDB();

app.use(bodyParser.json());

const authRouter = require("./routes/auth.route");
const userRouter = require("./routes/user.route");
const postRouter = require("./routes/post.route");
const pageRouter = require("./routes/page.route");

if (process.env.NODE_ENV === "development") {
  app.use(cors());
  app.use(morgan("dev"));
}

// Use Routes
app.use("/api", authRouter);
app.use("/api", userRouter);
app.use("/api", postRouter);
app.use("/api/page", pageRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    msg: "Page not found",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
