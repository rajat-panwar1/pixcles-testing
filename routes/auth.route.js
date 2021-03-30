const User = require("../models/auth.model");
const express = require("express");
const router = express.Router();
const { errorHandler } = require("../helpers/dbErrorHandling");
const Nexmo = require("nexmo");
const nexmo = new Nexmo({
  apiKey: "a54a75f4",
  apiSecret: "KqTuwzPkj9WmM9Ct",
});
let reqId;

// Load Controllers
const {
  registerController,
  activationController,
  signinController,
  forgotPasswordController,
  resetPasswordController,
  googleController,
  facebookController,
} = require("../controllers/auth.controller");

const { resetPasswordValidator } = require("../helpers/valid");

router.post("/register", registerController);

router.post("/login", signinController);

router.post("/activation", activationController);

// forgot reset password
router.put("/forgotpassword", forgotPasswordController);

router.put("/resetpassword", resetPasswordValidator, resetPasswordController);

// Google and Facebook Login
router.post("/googlelogin", googleController);
router.post("/facebooklogin", facebookController);

router.post("/sendotp", (req, res) => {
  const { number } = req.body;
  nexmo.verify.request(
    {
      number: "91" + number,
      brand: "pixcles",
      code_length: "6",
    },
    (err, result) => {
      if (err) {
        console.log(err);
        return res.json({
          code: "400",
          msg: err,
        });
      } else {
        reqId = result.request_id;

        return res.json({
          code: 200,
          msg: "Sent",
          data: [{ number }],
        });
      }
    }
  );
});

router.post("/verifyOtp", (req, res) => {
  const { code } = req.body;
  nexmo.verify.check(
    {
      request_id: reqId,
      code: code,
    },
    (err, result) => {
      if (err) {
        console.log(err);
        return res.json({
          code: 400,
          msg: "failed",
        });
      } else {
        if (result.status === "0") {
          return res.json({
            code: 200,
            msg: "success",
          });
        } else {
          res.json({
            code: 400,
            msg: "Failed",
          });
        }
      }
    }
  );
});

router.post("/registernumber", (req, res) => {
  const { username, number, password } = req.body;
  const user = new User({
    username,
    number,
    password,
  });

  user.save((err, user) => {
    if (err) {
      console.log("Save error", errorHandler(err));
      return res.json({
        code: 401,
        msg: errorHandler(err),
      });
    } else {
      return res.json({
        code: 200,
        msg: "sucess",
        data: [user],
      });
    }
  });
});

module.exports = router;
