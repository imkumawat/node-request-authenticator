const mongoose = require("mongoose");

module.exports.users = mongoose.model(
  "Users",
  require("./schemas/users-shcema")
);

module.exports.jwtTokens = mongoose.model(
  "Jwt-Tokens",
  require("./schemas/jwt-tokens-schema")
);
