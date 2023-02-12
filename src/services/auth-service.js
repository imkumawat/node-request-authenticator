const { jwtTokens } = require("../models");
const redis = require("../utils/redis-client");
const { verifySecureToken } = require("../utils/secure-token");
const { verifyJwt } = require("./jwt-service");
const moment = require("moment");
// we can verify token for email address verification or password reset email
const verifyAccount = async (token, verificationType) => {
  const tokenData = await verifyJwt(token);
  const sub = tokenData.data.sub;
  const key = `${verificationType}_${sub}`;
  let identifier = "";
  if (
    (identifier =
      (await redis.getKey(key)) && identifier === tokenData.identifier)
  ) {
    await redis.deleteKey(key);
    return true;
  }
  return false;
};

const killAllActiveLogins = async (sub) => {
  const cachedIdentifiers = await redis.getList(sub);
  await Promise.all([
    // deleting list or single key
    redis.deleteKey(sub),
    // Single Device System //
    /*
    
    jwtTokens.deleteOne({
      sub: sub,
    }),
     */
    // Single Device System //
    // Multiple Device Login //
    cachedIdentifiers.map(async (identifier) => {
      await redis.deleteKey(identifier);
    }),
    jwtTokens.deleteMany({
      sub: sub,
    }),
    // Multiple Device Login //
  ]);
  return;
};

const logoutParticularSession = async (sub, identifier) => {
  // get all login list
  const cachedIdentifiers = await redis.getList(sub);
  // check if given identifier belongs in the user's all login list or not
  // if yes then delete the identifier from redis and user's redis login list
  if (cachedIdentifiers.includes(identifier)) {
    await Promise.all([
      redis.deleteKey(identifier),
      redis.removeFromList(sub, identifier),
      jwtTokens.deleteOne({
        identifier: identifier,
      }),
    ]);
    console.log("Session is terminated");
  }

  // now we are not able to clear the token from db for this identifier
  // so create a db service that automatically deletes documents after 30 days
  // if refreshtoken documment >30days delete, becoz niether access nor refresh have validity more then 30 days
  return;
};

const logoutAllLoginsExceptCurrentLogin = async (sub, currentIdentifier) => {
  // user above function to acheive this
  const cachedIdentifiers = await redis.getList(sub);
  await Promise.all(
    cachedIdentifiers.map(async (identifier) => {
      if (identifier !== currentIdentifier) {
        await logoutParticularSession(sub, identifier);
      }
    })
  );
  return;
};

const getAllActiveLogins = async (sub) => {
  const allActiveLogins = [];
  //get all login list
  const cachedIdentifiers = await redis.getList(sub);

  // check existance of identifiers in redis
  // if identifiers is older then 30 days remove them
  // from the redis and login list redis by this redis will have consisten login session for the user
  // we have valid active logins,
  // decrypt the identifiers and attach the last accessed time and prepare the response and push to array
  await Promise.all(
    cachedIdentifiers.map(async (identifier) => {
      const lastAccessTime = await redis.getKey(identifier);

      // if (lastAccessTime > "30 days") {
      //   await Promise.all([
      //     redis.deleteKey(identifier),
      //     redis.removeFromList(sub, identifier),
      //   ]);
      // } else {
      const data = verifySecureToken(identifier);
      const login = {
        Device: data.device,
        Origin: data.origin,
        IssuedAt: moment.unix(data.iat).format("MM-DD-YYYY HH:mm:ss"),
        LastAccessedAt: moment
          .unix(lastAccessTime)
          .format("MM-DD-YYYY HH:mm:ss"),
        Identifier: identifier,
      };
      allActiveLogins.push(login);

      //}
    })
  );

  // send this back to client and ask client to filter them as iat field
  // show active if last accessed time is under last 5 mins otherwise show the
  // last accessed time
  return allActiveLogins;
};

module.exports = {
  verifyAccount,
  killAllActiveLogins,
  logoutAllLoginsExceptCurrentLogin,
  logoutParticularSession,
  getAllActiveLogins,
};
