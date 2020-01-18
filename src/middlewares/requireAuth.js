const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("User");
const keys = require("../../keys");
const localSCRT = keys.localSCRT;
const SCRT = process.env.JWT_SECRET || localSCRT;

module.exports = (req, res, next) => {
  const { authorization } = req.headers;
  // authorization === 'Bearer ladklasjdlhgfkda'

  if (!authorization) {
    return res.status(401).send({ error: "You must be logged in." });
  }

  const token = authorization.replace("Bearer ", "");
  jwt.verify(token, SCRT, async (err, payload) => {
    if (err) {
      return res.status(401).send({ error: "You must be logged in." });
    }

    const { userId } = payload;

    const user = await User.findById(userId);
    req.user = user;
    next();
  });
};
