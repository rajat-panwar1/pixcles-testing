const express = require("express");
const router = express.Router();
const { userByID } = require("../controllers/user.controller");
const { requireSignin } = require("../controllers/auth.controller");
const {
  listByUser,
  listNewsFeed,
  create,
  postByID,
  remove,
  photo,
  like,
  unlike,
  comment,
  uncomment,
  isPoster,
} = require("../controllers/post.controller");

router.route("/posts/new/:userId").post(requireSignin, create);

router.route("/posts/photo/:postId").get(photo);

router.route("/posts/by/:userId").get(requireSignin, listByUser);

router.route("/posts/feed/:userId").get(requireSignin, listNewsFeed);

router.route("/posts/like").put(requireSignin, like);
router.route("/posts/unlike").put(requireSignin, unlike);

router.route("/posts/comment").put(requireSignin, comment);
router.route("/posts/uncomment").put(requireSignin, uncomment);

router.route("/posts/:postId").delete(requireSignin, isPoster, remove);

router.param("userId", userByID);
router.param("postId", postByID);

module.exports = router;
