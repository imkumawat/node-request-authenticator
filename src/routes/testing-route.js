const express = require("express");

const router = express.Router();
const passport = require("passport");

const {
  register,
  login,
  logout,
  regenerateTokens,
  getAllLogins,
  logoutASession,
  killAllActiveSessions,
  logoutAllExceptCurrent,
} = require("../controllers/user-controller");

router.route("/register").post(register);

router.route("/login").post(login);

router
  .route("/authenticate")
  .post(passport.authenticate("jwt", { session: false }), (req, res) => {
    console.log("is authenticated: ", req.isAuthenticated());
    res.send("You have authenticated successfully");
  });

router.route("/regenerate-tokens").post(regenerateTokens);

router
  .route("/logout")
  .post(passport.authenticate("jwt", { session: false }), logout);

router
  .route("/get-all-active-logins")
  .get(passport.authenticate("jwt", { session: false }), getAllLogins);

router
  .route("/logout-session/:identifier")
  .post(passport.authenticate("jwt", { session: false }), logoutASession);

router
  .route("/logout-all-sessions")
  .post(
    passport.authenticate("jwt", { session: false }),
    killAllActiveSessions
  );

router
  .route("/logout-all-except-current")
  .post(
    passport.authenticate("jwt", { session: false }),
    logoutAllExceptCurrent
  );
module.exports = { router };
