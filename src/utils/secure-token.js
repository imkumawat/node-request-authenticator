const crypto = require("crypto");
const moment = require("moment");

const cryptoConfig = {
  algorithm: "aes-256-cbc",
  initVector: "12345678901234567890123456789013",
  securityKey:
    "1234567890123456789012345678901312345678901234567890123456789013",
};

/**
 *
 * @param {object} data Object that needs to be encrypted
 * @returns {string} Encrypted string
 */
exports.generateSecureToken = (data) => {
  // we assume that data is type of object

  // adding some random salt in the data to make generated token unique
  // for everytime and even unique for same data/payload
  data._ = moment().unix();

  // stringifying data.
  // so use JSON.parse after decrypting the secured token
  const payload = JSON.stringify(data);

  const cipher = crypto.createCipheriv(
    cryptoConfig.algorithm,
    Buffer.from(cryptoConfig.securityKey, "hex"),
    Buffer.from(cryptoConfig.initVector, "hex")
  );

  let securedToken = cipher.update(payload, "utf-8", "hex");
  securedToken += cipher.final("hex");

  return securedToken;
};

/**
 *
 * @param {string} securedToken Encrypted string
 * @returns {object} Decrypted object
 */
exports.verifySecureToken = (securedToken) => {
  const decipher = crypto.createDecipheriv(
    cryptoConfig.algorithm,
    Buffer.from(cryptoConfig.securityKey, "hex"),
    Buffer.from(cryptoConfig.initVector, "hex")
  );

  let verifiedToken = decipher.update(securedToken, "hex", "utf-8");
  verifiedToken += decipher.final("utf8");

  // parsing the stringfied data
  const data = JSON.parse(verifiedToken);

  // removing the added salt
  delete data._;

  return data;
};

/**
 *
 * @param {number} size Specify the size of random token, default is 32
 * @returns {string} Random stringified token
 */
exports.generateRandomToken = (size = 32) => {
  const token = crypto.randomBytes(size).toString("hex");

  return token;
};
