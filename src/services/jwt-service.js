const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const { jwtTokens } = require("../models");
const redis = require("../utils/redis-client");

const {
  generateSecureToken,
  verifySecureToken,
} = require("../utils/secure-token");

const jwtConfig = {
  accessTokenExpiresIn: 120,
  refreshTokenExpiresIn: 300,
};

/**
 *
 * @param {object} payload User object that contains sensitive data used to identify of a user
 * @param {string} type  Type of jwt token to be generated, default is access token
 * @param {boolean} rememberMe To extend validity of access token up to 30 days, default false and 24 hrs
 * @returns {string} Jwt Token
 */
const generateJwt = async (
  payload,
  type = "accessToken",
  rememberMe = false
) => {
  // adding informational data
  payload.type = type;
  payload.rememberMe = rememberMe;

  // decrypting the payload to prevent viewing data inside of it.
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
          ? `${jwtConfig.refreshTokenExpiresIn}s`
          : `${jwtConfig.accessTokenExpiresIn}s`,
      algorithm: "RS256",
    }
  );

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
    await redis.pushIntoList(payload.sub.toString(), securedToken);
    await redis.setExpirationOnKey(
      payload.sub.toString(),
      jwtConfig.accessTokenExpiresIn
    );
  }
  // Multiple Device Login //

  return jwtToken;
};

/**
 *
 * @param {string} payload Verified and decoded jwt token
 * @param {function} callback Returns callback
 * @returns {function} Returns callback
 */
const verifyJwt = async (payload, callback) => {
  // here we recieved payload after verifying jwt,
  // decrypting the data, as we encrypted when genearating jwt token
  let data = verifySecureToken(payload.identifier);

  // We only allow access tokens to authenticate
  if (data.type !== "accessToken") {
    console.log("You are not authorized...invalid token type");
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
    return callback(null, false);
  }
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
 * @returns {object} new jwt access and refresh token
 */

const regenerateJwt = async (accessToken, refreshToken) => {
  try {
    const verifiedRefreshTokenPayload = jwt.verify(
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
    const data = verifySecureToken(verifiedRefreshTokenPayload.identifier);
    const tokenPreference = data.rememberMe;
    // Forming the original payload
    delete data.type;
    delete data.rememberMe;

    // Now generating new access token and refresh token using the original data/payload
    const jwts = await Promise.all([
      generateJwt(data, "accessToken", tokenPreference),
      generateJwt(data, "refreshToken"),
    ]);
    return { accessToken: jwts[0], refreshToken: jwts[1], sub: token.sub };
  } catch (err) {
    throw new Error(err.message);
  }
};

module.exports = { generateJwt, verifyJwt, expireJwt, regenerateJwt };
