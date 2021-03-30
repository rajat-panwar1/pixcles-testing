const User = require("../models/auth.model");
const _ = require("lodash");
const { OAuth2Client } = require("google-auth-library");
const fetch = require("node-fetch");
const { authenticator } = require("otplib");
const secret = "KVKFKRCPNZQUYMLXOVYDSQKJKZDTSRLD";
const token = authenticator.generate(secret);
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const { errorHandler } = require("../helpers/dbErrorHandling");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.MAIL_KEY);
const generateOTP = () => {
  var digits = "0123456789";
  var otpLength = 4;
  var otp = "";
  for (let i = 1; i <= otpLength; i++) {
    var index = Math.floor(Math.random() * digits.length);
    otp = otp + digits[index];
  }
  return otp;
};
const Vonage = require("@vonage/server-sdk");

const vonage = new Vonage({
  apiKey: "a54a75f4",
  apiSecret: "KqTuwzPkj9WmM9Ct",
});

exports.registerController = (req, res) => {
  const { email } = req.body;

  User.findOne({
    email,
  }).exec((err, user) => {
    if (user) {
      return res.json({ code: 400, msg: "Email is taken" });
    }
  });

  const otp = generateOTP();

  const emailData = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Account activation link",
    html: `
                <h1>Please use the following OTP</h1>
                <p>${otp}</p>
                <hr />
            `,
  };

  sgMail
    .send(emailData)
    .then((sent) => {
      return res.json({
        code: 200,
        msg: `An OTP has been sent to your ${email}. Please check your Email.`,
        data: [{ otp, email }],
      });
    })
    .catch((err) => {
      return res.json({
        code: 400,
        msg: errorHandler(err),
      });
    });
};

exports.activationController = (req, res) => {
  const { otp1, otp2, username, email, password } = req.body;

  if (otp1 !== otp2) {
    console.log("Activation error");
    return res.json({
      code: 401,
      msg: "Incorect OTP",
    });
  } else {
    console.log(email);
    const user = new User({
      username,
      email,
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
  }
};

exports.signinController = (req, res) => {
  const { email, number, password } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array().map((error) => error.msg)[0];
    return res.json({
      code: 422,
      msg: firstError,
    });
  } else {
    // check if user exist
    if (email) {
      User.findOne({
        email,
      }).exec((err, user) => {
        if (err || !user) {
          return res.json({
            code: 400,
            msg: "No Account Found. Try Signing Up!",
          });
        }
        // authenticate
        if (!user.authenticate(password)) {
          return res.json({
            code: 400,
            msg: "Email and password do not match",
          });
        }
        // generate a token and send to client
        const token = jwt.sign(
          {
            _id: user._id,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );
        const { _id, name, email, role } = user;

        return res.json({
          code: 200,
          msg: "success",
          token: token,
          data: [user],
        });
      });
    }
    if (number) {
      User.findOne({
        number,
      }).exec((err, user) => {
        if (err || !user) {
          return res.json({
            code: 400,
            msg: "No Account Found. Try Signing Up!",
          });
        }
        // authenticate
        if (!user.authenticate(password)) {
          return res.json({
            code: 400,
            msg: "Number and password do not match",
          });
        }
        // generate a token and send to client
        const token = jwt.sign(
          {
            _id: user._id,
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );
        const { _id, name, number, role } = user;

        return res.json({
          code: 200,
          msg: "success",
          token: token,
          data: [user],
        });
      });
    }
  }
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

exports.hasAuthorization = (req, res, next) => {
  const authorized = req.profile && req.auth && req.profile._id == req.auth._id;
  if (!authorized) {
    return res.status("403").json({
      error: "User is not authorized",
    });
  }
  next();
};

exports.adminMiddleware = (req, res, next) => {
  User.findById({
    _id: req.user._id,
  }).exec((err, user) => {
    if (err || !user) {
      return res.json({
        code: 400,
        msg: "User not found",
      });
    }

    if (user.role !== "admin") {
      return res.json({
        code: 400,
        msg: "Admin resource. Access denied.",
      });
    }

    req.profile = user;
    next();
  });
};

exports.forgotPasswordController = (req, res) => {
  const { email, number } = req.body;
  const errors = validationResult(req);
  if (email) {
    if (!errors.isEmpty()) {
      const firstError = errors.array().map((error) => error.msg)[0];
      return res.json({
        code: 422,
        msg: firstError,
      });
    } else {
      User.findOne(
        {
          email,
        },
        (err, user) => {
          if (err || !user) {
            return res.json({
              code: 400,
              msg: "No Account Found. Try Signing Up!",
            });
          }

          const token = jwt.sign(
            {
              _id: user._id,
            },
            process.env.JWT_RESET_PASSWORD,
            {
              expiresIn: "10m",
            }
          );

          const emailData = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: `Password Reset link`,
            html: `
                    <h1>Please use the following link to reset your password</h1>
                    <p>${process.env.CLIENT_URL}/users/password/reset/${token}/</p>
                    <hr />
                    <p>This email may contain sensetive information</p>
                    <p>${process.env.CLIENT_URL}</p>
                `,
          };

          return user.updateOne(
            {
              resetPasswordLink: token,
            },
            (err, success) => {
              if (err) {
                console.log("RESET PASSWORD LINK ERROR", err);
                return res.json({
                  code: 400,
                  msg:
                    "Database connection error on user password forgot request.",
                });
              } else {
                sgMail
                  .send(emailData)
                  .then((sent) => {
                    // console.log('SIGNUP EMAIL SENT', sent)
                    return res.json({
                      code: 200,
                      msg: `Password reset link has been sent to ${email}. Follow the instruction to reset your password.`,
                    });
                  })
                  .catch((err) => {
                    // console.log('SIGNUP EMAIL SENT ERROR', err)
                    return res.json({
                      code: 400,
                      msg: err.message,
                    });
                  });
              }
            }
          );
        }
      );
    }
  }
  if (number) {
    if (!errors.isEmpty()) {
      const firstError = errors.array().map((error) => error.msg)[0];
      return res.json({
        code: 422,
        msg: firstError,
      });
    } else {
      User.findOne(
        {
          number,
        },
        (err, user) => {
          if (err || !user) {
            return res.json({
              code: 400,
              msg: "No Account Found. Try Signing Up!",
            });
          }

          const token = jwt.sign(
            {
              _id: user._id,
            },
            process.env.JWT_RESET_PASSWORD,
            {
              expiresIn: "10m",
            }
          );

          const text = `${process.env.CLIENT_URL}/users/password/reset/${token}`;
          const brand = "piclxs";

          return user.updateOne(
            {
              resetPasswordLink: token,
            },
            (err, success) => {
              if (err) {
                console.log("RESET PASSWORD LINK ERROR", err);
                return res.json({
                  code: 400,
                  msg:
                    "Database connection error on user password forgot request.",
                });
              } else {
                vonage.message.sendSms(
                  brand,
                  number,
                  text,
                  (err, responseData) => {
                    if (err) {
                      console.log(err);
                    } else {
                      if (responseData.messages[0]["status"] === "0") {
                        return console.log("Message sent successfully.");
                      } else {
                        return console.log(
                          `Message failed with error: ${responseData.messages[0]["error-text"]}`
                        );
                      }
                    }
                  }
                );
              }
            }
          );
        }
      );
    }
  }
};

exports.resetPasswordController = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array().map((error) => error.msg)[0];
    return res.json({
      code: 422,
      msg: firstError,
    });
  } else {
    if (resetPasswordLink) {
      jwt.verify(
        resetPasswordLink,
        process.env.JWT_RESET_PASSWORD,
        function (err, decoded) {
          if (err) {
            return res.json({
              code: 400,
              msg: "Expired link. Try again",
            });
          }

          User.findOne(
            {
              resetPasswordLink,
            },
            (err, user) => {
              if (err || !user) {
                return res.json({
                  code: 400,
                  msg: "Something went wrong. Try again later!",
                });
              }

              const updatedFields = {
                password: newPassword,
                resetPasswordLink: "",
              };

              user = _.extend(user, updatedFields);

              user.save((err, result) => {
                if (err) {
                  return res.json({
                    code: 400,
                    msg: "Error resetting user password.",
                  });
                }
                res.json({
                  code: 200,
                  msg:
                    "Your password is now updated. Redirecting to login page ",
                });
              });
            }
          );
        }
      );
    }
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT);
// Google Login
exports.googleController = (req, res) => {
  const { idToken } = req.body;

  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT })
    .then((response) => {
      // console.log('GOOGLE LOGIN RESPONSE',response)
      const { email_verified, name, email } = response.payload;
      if (email_verified) {
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            const { _id, email, name, role } = user;
            return res.json({
              code: 200,
              msg: "success",
              token: token,
              data: [user],
            });
          } else {
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });
            user.save((err, data) => {
              if (err) {
                console.log("ERROR GOOGLE LOGIN ON USER SAVE", err);
                return res.json({
                  code: 400,
                  msg: "User signup failed with google",
                });
              }
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
              );
              const { _id, email, name, role } = data;
              return res.json({
                code: 200,
                msg: "success",
                token: token,
                data: [data],
              });
            });
          }
        });
      } else {
        return res.json({ code: 400, msg: "Google login failed. Try again" });
      }
    });
};

exports.facebookController = (req, res) => {
  // console.log("FACEBOOK LOGIN", req.body);
  const { userID, accessToken } = req.body;

  const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;

  return (
    fetch(url, {
      method: "GET",
    })
      .then((response) => response.json())
      // .then(response => console.log(response))
      .then((response) => {
        const { email, name } = response;
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: "7d",
            });
            const { _id, email, name, role } = user;
            return res.json({ code: 200, token: token, data: [user] });
          } else {
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });
            user.save((err, data) => {
              if (err) {
                console.log("ERROR FACEBOOK LOGIN ON USER SAVE", err);
                return res.json({
                  code: 400,
                  msg: "User signup failed with facebook",
                });
              }
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
              );
              const { _id, email, name, role } = data;
              return res.json({ code: 200, token: token, data: [data] });
            });
          }
        });
      })
      .catch((error) => {
        res.json({ code: 400, msg: "Facebook login failed. Try later" });
      })
  );
};
