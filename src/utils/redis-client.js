const { createClient } = require("redis");

let redis = "";

const redisClient = async () => {
  try {
    redis = createClient({
      socket: {
        host: "localhost",
        port: 6379,
      },
    });
    await redis.connect();

    return Promise.resolve("Connected to Redis");
  } catch (err) {
    return Promise.reject(err);
  }
};

/**
 *
 * @param {string} key
 * @param {number} expr
 * @param {string} value
 * @returns {string} status
 */
const setEx = async (key, expr, value) => {
  try {
    return redis.setEx(key, expr, value);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} key
 * @returns {string} value
 */
const getKey = async (key) => {
  try {
    return redis.get(key);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} key
 * @returns {string} status
 */
const deleteKey = async (key) => {
  try {
    return redis.DEL(key);
  } catch (error) {
    throw new Error(error.message);
  }
};

const pushIntoList = async (listName, value) => {
  try {
    return redis.LPUSH(listName, value);
  } catch (error) {
    throw new Error(error.message);
  }
};

const removeFromList = async (listName, value, occurance = 1) => {
  try {
    return redis.LREM(listName, occurance, value);
  } catch (error) {
    throw new Error(error.message);
  }
};

const getList = async (listName, startFrom = 0, endAt = -1) => {
  try {
    return redis.LRANGE(listName, startFrom, endAt);
  } catch (error) {
    throw new Error(error.message);
  }
};

const setExpirationOnKey = async (listName, expirationTimeInSeconds) => {
  try {
    return redis.expire(listName, expirationTimeInSeconds);
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  redisClient,
  setEx,
  getKey,
  deleteKey,
  pushIntoList,
  removeFromList,
  getList,
  setExpirationOnKey,
};
