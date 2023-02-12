const { createClient } = require("redis");

let redis = "";

/**
 *
 * @returns {Promise}
 */
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
 * @param {string | number} value
 * @returns {Promise}
 */
const setEx = (key, expr, value) => {
  try {
    return redis.setEx(key, expr, value);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} key
 * @param {string | number} value
 * @returns {Promise}
 */
const set = (key, value) => {
  try {
    return redis.set(key, value);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} key
 * @returns {Promise}
 */
const getKey = (key) => {
  try {
    return redis.get(key);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} key
 * @returns {Promise}
 */
const deleteKey = (key) => {
  try {
    return redis.DEL(key);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} listName
 * @param {string | number} value
 * @returns {Promise}
 */
const pushIntoList = (listName, value) => {
  try {
    return redis.LPUSH(listName, value);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} listName
 * @param {string | number} value
 * @param {number} occurance
 * @returns {Promise}
 */
const removeFromList = (listName, value, occurance = 1) => {
  try {
    return redis.LREM(listName, occurance, value);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} listName
 * @param {number} startFrom
 * @param {number} endAt
 * @returns {Promise}
 */
const getList = (listName, startFrom = 0, endAt = -1) => {
  try {
    return redis.LRANGE(listName, startFrom, endAt);
  } catch (error) {
    throw new Error(error.message);
  }
};

/**
 *
 * @param {string} listName
 * @param {number} expirationTimeInSeconds
 * @returns {Promise}
 */
const setExpirationOnKey = (listName, expirationTimeInSeconds) => {
  try {
    return redis.expire(listName, expirationTimeInSeconds);
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  redisClient,
  setEx,
  set,
  getKey,
  deleteKey,
  pushIntoList,
  removeFromList,
  getList,
  setExpirationOnKey,
};
