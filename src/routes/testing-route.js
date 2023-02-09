const express = require("express");

const router = express.Router();
const passport = require("passport");

const {
  register,
  login,
  logout,
  regenerateTokens,
} = require("../controllers/user-controller");
const { generateJwt } = require("../services/jwt-service");

router.route("/register").post(register);

router.route("/login").post(login);

router
  .route("/authenticate")
  .post(passport.authenticate("jwt", { session: false }), (req, res) => {
    console.log("req user:\n", req.user);
    console.log("is authenticated: ", req.isAuthenticated());
    res.send("You have authenticated successfully");
  });

router
  .route("/logout")
  .post(passport.authenticate("jwt", { session: false }), logout);

router.route("/regenerate-tokens").post(regenerateTokens);

module.exports = { router };
