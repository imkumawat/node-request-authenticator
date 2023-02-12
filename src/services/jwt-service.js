const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const moment = require("moment");

const { jwtTokens } = require("../models");
const redis = require("../utils/redis-client");

const {
  generateSecureToken,
  verifySecureToken,
} = require("../utils/secure-token");

const jwtConfig = {
  roles: ["user", "admin"],
  validTokenTypes: [
    "accessToken",
    "refreshToken",
    "emailVerification",
    "passwordReset",
  ],
  ExpiresIn: {
    accessToken: 300,
    refreshToken: 900,
    emailVerification: 86400, // 24 hrs
    passwordReset: 900, // 15 minutes
  },
};

/**
 *
 * @param {object} payload User object that contains sensitive data used to identify of a user
 * @param {string} type  Type of jwt token to be generated, default is access token
 * @param {boolean} rememberMe To extend validity of access token
 * @param {string} role Authorization type of token
 * @returns {Promise}
 */
const generateJwt = async (
  payload,
  type = "accessToken",
  rememberMe = false,
  role = "user"
) => {
  // checking params input
  if (
    !jwtConfig.validTokenTypes.includes(type) ||
    !jwtConfig.roles.includes(role)
  ) {
    throw new Error("Invalid type of token or role");
  }

  // adding token preference
  payload.type = type;
  payload.rememberMe = rememberMe;
  payload.role = role;

  // ecrypting the payload to prevent viewing data inside of it.
  const securedToken = generateSecureToken(payload);

  // creating the jwt using decrpted payload
  const jwtToken = jwt.sign(
    { identifier: securedToken },
    fs.readFileSync(
      path.join(__dirname, "..", "/keys/jwt-private-key.pem"),
      "utf8"
    ),
    {
      expiresIn:
        type === "refreshToken" || rememberMe
          ? `${jwtConfig.ExpiresIn["refreshToken"]}s`
          : `${jwtConfig.ExpiresIn[type]}s`,
      algorithm: "RS256",
    }
  );

  if (type === "emailVerification" || "passwordReset") {
    // Using user's unique identification, by this if user requests multiple email verification
    // or password reset email, then only most recent will work, and all previous emails will
    // not work, this is a good security practice
    await redis.setEx(
      `${type}_${payload.sub}`,
      jwtConfig.ExpiresIn[type],
      securedToken
    );
  }
  if (type === "accessToken") {
    // Single Device Login //
    /*
    await redis.setEx(
      payload.sub.toString(),
      jwtConfig.accessTokenExpiresIn,
      securedToken
    );
    
    */
    // Single Device Login //

    // Multiple Device Login //
    await Promise.all([
      // Needed to check when token last time accessed
      redis.set(securedToken, moment().unix()),
      redis.pushIntoList(payload.sub.toString(), securedToken),
      redis.setExpirationOnKey(
        payload.sub.toString(),
        jwtConfig.ExpiresIn[type]
      ),
    ]);
  }
  // Multiple Device Login //

  return { jwtToken, securedToken };
};

/**
 *
 * @param {string} jwtToken
 * @returns {Promise}
 */
const verifyJwt = async (jwtToken) => {
  const verifiedJwt = jwt.verify(
    jwtToken,
    fs.readFileSync(
      path.join(__dirname, "..", "/keys/jwt-public-key.pem"),
      "utf8"
    )
  );

  const securedToken = verifiedJwt.payload.identifier;
  const data = verifySecureToken(securedToken);

  return { identifier: payload.identifier, data: data };
};

/**
 *
 * @param {string} payload Verified and decoded jwt token
 * @param {function} callback Returns callback
 * @returns {function} Returns callback
 */
const verifyJwtCallback = async (payload, callback) => {
  // here we recieved payload after verifying jwt,
  // decrypting the data, as we encrypted when genearating jwt token
  let data = verifySecureToken(payload.identifier);

  // We only allow access tokens to authenticate
  if (data.type !== "accessToken") {
    console.log("You are not authorized...invalid token type");
    // we can add rate limiter if needed
    return callback(null, false);
  }

  // Single Device Login //
  /*
  const securedToken = await redis.getKey(data.sub);
  if (securedToken !== payload.identifier) {
    console.log("You are not authorized...token not found in redis");
    return callback(null, false);
  }
  */
  // Single Device Login //

  // Multiple Device Login //
  const activeLogins = await redis.getList(data.sub);
  if (!activeLogins.includes(payload.identifier)) {
    console.log("You are not authorized...token not found in redis");
    // we can add rate limiter if needed
    return callback(null, false);
  }

  // check user login compulsion to force user re-authenticate from certain time of login
  // if data.iat > 3 months then call expireJwt and ask use to re-login

  // Updating token accessed time
  // you should create a redis service that delete these keys when they elapsed 30 days..
  // the identifier will only valid at max 30 days.
  // so get this key value and check if it crossed 30 days then delete it
  await redis.set(payload.identifier, moment().unix());
  // Multiple Device Login //

  // Optional for more security, strict to original remote host machine only for which jwt is generated:
  /**
   * We can modify below code as we want
   * You must pass the remote/host mac address in payload and
   * must attach in req object
   * if(data.macAddress !== req.macAddress)
   * {
   *   console.log("You are not authorized...mac is different for which jwt is generated");
   *  return callback(null, false);
   * }
   */

  // attaching the identifier to data, needed at expireJwt to terminate active jwt logins from redis cache
  // in case of mupltiple logins
  data.identifier = payload.identifier;

  return callback(null, data);
};

/**
 *
 * @param {string} sub Unique user id
 * @param {string} accessToken Jwt access token
 * @param {string} identifier Identifier to remove from cache in case of mupltiple logins
 * default is false indicates that there is no multiple logins system implemented
 * @returns
 */
const expireJwt = async (sub, identifier = false, accessToken = false) => {
  await Promise.all([
    // Single Device Login //
    /*
    redis.deleteKey(sub),
    jwtTokens.deleteOne({
      sub: sub,
    }),
    */
    // Single Device Login //

    // Multiple Device Login //
    redis.deleteKey(identifier),
    redis.removeFromList(sub, identifier),
    jwtTokens.deleteOne({
      accessToken: accessToken,
    }),
    // Multiple Device Login //
  ]);

  return;
};

/**
 *
 * @param {string} accessToken Expired/Active jwt access token that belongs to same refresh token
 * @param {string} refreshToken Valid jwt refresh token
 * @returns {Promise} new jwt access and refresh token
 */

const regenerateJwt = async (accessToken, refreshToken) => {
  jwt.verify(
    refreshToken,
    fs.readFileSync(
      path.join(__dirname, "..", "/keys/jwt-public-key.pem"),
      "utf8"
    )
  );

  const token = await jwtTokens.findOne({
    accessToken: accessToken,
  });

  if (!token || token.refreshToken !== refreshToken) {
    // use your own error creater and handler
    throw new Error("Invalid access token or refresh token");
  }

  // Single Device Login //
  /*
    await expireJwt(token.sub.toString());
    */
  // Single Device Login //

  // Multiple Device Login //
  const accessTokenPayload = jwt.decode(accessToken, {
    complete: true,
  });
  await expireJwt(
    token.sub.toString(),
    accessTokenPayload.payload.identifier,
    accessToken
  );
  // Multiple Device Login //

  // Dcrypting the identifier
  const payload = verifySecureToken(accessTokenPayload.payload.identifier);

  // getting token preferences
  const accessTokenPreference = payload.rememberMe;
  const role = payload.role;

  // Now generating new access token and refresh token using the original data/payload
  const jwts = await Promise.all([
    generateJwt(payload, "accessToken", accessTokenPreference, role),
    generateJwt(payload, "refreshToken", false, role),
  ]);

  const accesstoken = jwts[0].jwtToken;
  const refreshtoken = jwts[1].jwtToken;
  await jwtTokens.create({
    sub: result._id,
    identifier: jwts[0].securedToken,
    accessToken: accesstoken,
    refreshToken: refreshtoken,
  });

  return { accessToken, refreshToken };
};

module.exports = {
  generateJwt,
  verifyJwt,
  verifyJwtCallback,
  expireJwt,
  regenerateJwt,
};
