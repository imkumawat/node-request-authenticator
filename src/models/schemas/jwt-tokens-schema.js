const mongoose = require("mongoose");
const validator = require("validator");
const jwtSchema = new mongoose.Schema(
  {
    sub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "User Id is required"],
    },
    identifier: {
      type: String,
      unique: true,
      required: [true, "Identifier of access token is required"],
      trim: true,
    },

    accessToken: {
      type: String,
      unique: true,
      required: [true, "Access token is required"],
      trim: true,
    },

    refreshToken: {
      type: String,
      required: [true, "Refresh token is required"],
      trim: true,
    },
  },

  {
    timestamps: true,
  }
);

jwtSchema.index({ sub: 1, identifier: 1, accessToken: 1 });

module.exports = jwtSchema;
