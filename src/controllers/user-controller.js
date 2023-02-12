const moment = require("moment");

const { users, jwtTokens } = require("../models");
const {
  generateJwt,
  regenerateJwt,
  expireJwt,
} = require("../services/jwt-service");
const {
  getAllActiveLogins,
  logoutParticularSession,
  killAllActiveLogins,
  logoutAllLoginsExceptCurrentLogin,
} = require("../services/auth-service");
const register = async (req, res) => {
  try {
    const { name, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
      return res
        .status(400)
        .json({ message: "Password and confirm password is not same" });
    }

    const result = await users.create({
      name: name,
      email: email,
      password: password,
    });
    return res.status(200).json({ message: "okay", user: result });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await users.findOne({ email: email });
    if (!result || !(await result.isPasswordMatch(password))) {
      return res.status(400).json({ message: "Invalid creadentials" });
    } else {
      // user is authneticated
      // now creating jwt tokens
      const payload = {};

      payload.sub = result._id;
      payload.email = result.email;
      payload.name = result.name;

      // issue at i.e iat, is needed if there is a compulsion in system that user has to
      // re-authenticate themself after certain time of initiated login time
      payload.iat = moment().unix();
      payload.device = req.headers["user-agent"];
      payload.origin = req.clientIp;

      // try to add if posible
      //payload.geoLocation = "ip2location";

      // add last access time in active login payload whenever api request is comes

      const tokens = await Promise.all([
        generateJwt(payload),
        generateJwt(payload, "refreshToken"),
      ]);

      const accesstoken = tokens[0].jwtToken;
      const refreshtoken = tokens[1].jwtToken;

      // storing these tokens in db

      // Single Device Login //
      /*
      await jwtTokens.findOneAndUpdate(
        {
          sub: result._id,
        },
        {
          accessToken: accesstoken,
          refreshToken: refreshtoken,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
      */
      // Single Device Login //

      // Multiple Device Login //
      await jwtTokens.create({
        sub: result._id,
        identifier: tokens[0].securedToken,
        accessToken: accesstoken,
        refreshToken: refreshtoken,
      });
      // Multiple Device Login //

      console.log("Logged In Successfully");
      return res.status(200).json({
        message: "okay",
        access_token: accesstoken,
        refresh_token: refreshtoken,
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    const sub = req.user.sub;

    // Single Device Login //
    /*
    await expireJwt(sub);
    */
    // Single Device Login //

    // Multiple Device Login //
    const identifier = req.user.identifier;
    const accessToken = req.headers.authorization.split(" ")[1];
    await expireJwt(sub, identifier, accessToken);
    // Multiple Device Login //
    console.log("Logged Out Successfully");
    return res.status(200).json({ message: "okay", status: "logged out" });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err });
  }
};

const regenerateTokens = async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    const jwts = await regenerateJwt(access_token, refresh_token);

    const accesstoken = jwts.accessToken;
    const refreshtoken = jwts.refreshToken;

    // Single Device Login //
    /*
    await jwtTokens.findOneAndUpdate(
      {
        sub: jwts.sub,
      },
      {
        accessToken: accesstoken,
        refreshToken: refreshtoken,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    */
    // Single Device Login //

    // Multiple Device Login //
    await jwtTokens.create({
      sub: jwts.sub,
      accessToken: accesstoken,
      refreshToken: refreshtoken,
    });
    // Multiple Device Login //
    console.log("Access & Refresh Tokens Generated Successfully");
    return res.status(200).json({
      message: "okay",
      access_token: accesstoken,
      refresh_token: refreshtoken,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

const getAllLogins = async (req, res) => {
  try {
    const data = await getAllActiveLogins(req.user.sub);
    console.log("All Active Logins Retreived Successfully");
    return res.status(200).json({
      message: "okay",
      data: data,
    });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

const logoutASession = async (req, res) => {
  try {
    await logoutParticularSession(req.user.sub, req.params.identifier);
    console.log("Session Logged Out Successfully");
    return res.status(200).json({
      message: "okay",
    });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

const killAllActiveSessions = async (req, res) => {
  try {
    await killAllActiveLogins(req.user.sub);
    console.log("All Session Logged Out Successfully");
    return res.status(200).json({
      message: "okay",
    });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

const logoutAllExceptCurrent = async (req, res) => {
  try {
    await logoutAllLoginsExceptCurrentLogin(req.user.sub, req.user.identifier);
    console.log("Targeted Session Logged Out Successfully");
    return res.status(200).json({
      message: "okay",
    });
  } catch (err) {
    return res.status(500).json({ message: "Error", error: err.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  regenerateTokens,
  getAllLogins,
  logoutASession,
  killAllActiveSessions,
  logoutAllExceptCurrent,
};
