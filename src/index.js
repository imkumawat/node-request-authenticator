const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

const { redisClient, listPush } = require("./utils/redis-client");
const { jwtStrategy } = require("./passport/jwt-passport");
const { router } = require("./routes/testing-route");

const app = express();
app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "2mb" }));

passport.use(jwtStrategy);

app.use(router);

mongoose
  .connect("your db string", {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("Connected to database");

    redisClient().then((status) => {
      console.log(status);
      app.listen(4000, () => {
        console.log("Server is running on port 4000");
      });
    });
  });
