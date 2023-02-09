const { Strategy, ExtractJwt } = require("passport-jwt");
const { verifyJwt } = require("../services/jwt-service");
const fs = require("fs");
const path = require("path");

const options = {};

// telling to passport to extract jwt from req header and type of toke is Bearer
options.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
// providing jwt secret to passport to verify the extracted jwt token
options.secretOrKey = fs.readFileSync(
  path.join(__dirname, "..", "/keys/jwt-public-key.pem"),
  "utf8"
);
options.algorithms = ["RS256"];

// exporting the prepared strategy to use with passport in main file
// so that we can use this passport strategy at anywhere
exports.jwtStrategy = new Strategy(options, verifyJwt);
