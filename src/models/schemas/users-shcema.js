const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: [true, "Email is required"],
      validate: validator.isEmail,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      trim: true,
    },
  },

  {
    timestamps: true,
  }
);

// Do not use arrow => style functions, user native functions
userSchema.methods.isPasswordMatch = async function (password) {
  // const user = this;
  return bcrypt.compare(password, this.password);
};

userSchema.pre("save", async function (next) {
  const user = this;
  //if (user.isModified("password")) {
  user.password = await bcrypt.hash(user.password, 8);
  // }
  next();
});

userSchema.index({ email: 1 });

module.exports = userSchema;
