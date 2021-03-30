const express = require("express");
const router = express.Router();
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage");
const {
  requireSignin,
  adminMiddleware,
} = require("../controllers/auth.controller");
const DIR = "./public/";

const storage = new GridFsStorage({ url: process.env.MONGO_URI });

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype == "image/png" ||
      file.mimetype == "image/jpg" ||
      file.mimetype == "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(null, false);
      return cb(new Error("Only .png, .jpg and .jpeg format allowed!"));
    }
  },
});

//Load Profile Model
const Profile = require("../models/profile.model");

//Load Blog Model
const Page = require("../models/page.model");

router.get("/", (req, res) => {
  Blog.find()
    .sort({ date: "desc" })
    .then((blogs) => res.json(blogs))
    .catch((err) => res.json({ noBlog: " No pages to display" + err }));
});

router.get("/:id", (req, res) => {
  Blog.findById(req.params.id)
    .then((blog) => res.json(blog))
    .catch((err) => res.status(404).json({ nopagefound: "No page found" }));
});

router.post(
  "/",
  upload.single("coverImg"),
  requireSignin,
  adminMiddleware,
  (req, res) => {
    const newPage = new Page({
      user: req.user.id,
      title: req.body.title,
      description: req.body.description,
    });
    newPage
      .save()
      .then((page) =>
        res.json({
          msg: "Page added successfully!",
          page,
        })
      )
      .catch((err) => console.log("Unable to push Page to database" + err));
  }
);

module.exports = router;
