const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  friends: {
    type: Array
  }
});

// Functions below modify User model and are called whenever a new User is created

// salts and hashes password whenever we attempt to create a new user and save to DB
userSchema.pre("save", function(next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }

    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});
userSchema.pre("findOneAndUpdate", function(next) {
  // const user = this._update;
  // if (!user.isModified("password")) {
  //   return next();
  // }

  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }

    bcrypt.hash(this._update.password, salt, (err, hash) => {
      if (err) {
        return next(err);
      }
      this._update.password = hash;
      next();
    });
  });
});

// adds a method to each user to automatically compare user submitted password to password stored in DB
userSchema.methods.comparePassword = function(candidatePassword) {
  const user = this;

  return new Promise((resolve, reject) => {
    bcrypt.compare(candidatePassword, user.password, (err, isMatch) => {
      if (err) {
        return reject(err);
      }

      if (!isMatch) {
        return reject(false);
      }

      resolve(true);
    });
  });
};

mongoose.model("User", userSchema);
