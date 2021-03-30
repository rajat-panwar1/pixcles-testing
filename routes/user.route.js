const express = require("express");
const {
  userByID,
  read,
  list,
  remove,
  update,
  photo,
  defaultPhoto,
  addFollowing,
  addFollower,
  removeFollowing,
  removeFollower,
  findPeople,
} = require("../controllers/user.controller");
const {
  requireSignin,
  hasAuthorization,
} = require("../controllers/auth.controller");

const router = express.Router();

router.route("/users").get(list);

router.route("/users/photo/:userId").get(photo, defaultPhoto);
router.route("/users/defaultphoto").get(defaultPhoto);

router.route("/users/follow").put(requireSignin, addFollowing, addFollower);
router
  .route("/users/unfollow")
  .put(requireSignin, removeFollowing, removeFollower);

router.route("/users/findpeople/:userId").get(requireSignin, findPeople);

router
  .route("/users/:userId")
  .get(requireSignin, read)
  .put(requireSignin, hasAuthorization, update)
  .delete(requireSignin, hasAuthorization, remove);

router.param("userId", userByID);

module.exports = router;
