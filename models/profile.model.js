const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProfileSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  state: {
    type: String,
  },
  social: {
    facebook: {
      type: String,
    },
    instagram: {
      type: String,
    },
  },
  contact: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Profile = mongoose.model("myProfile", ProfileSchema);
