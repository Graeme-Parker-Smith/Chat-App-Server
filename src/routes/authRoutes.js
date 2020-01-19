const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = mongoose.model("User");
const Channel = mongoose.model("Channel");
const keys = require("../../keys");
const localSCRT = keys.localSCRT;
const SCRT = process.env.JWT_SECRET || localSCRT;

const router = express.Router();

router.post("/signup", async (req, res) => {
  // res.send("You made a post request on heroku!")
  console.log(req.body);
  const { username, password, avatar } = req.body;
  // const user = new User({ username, password });
  // await user.save();
  try {
    const user = new User({ username, password, avatar });
    await user.save();
    console.log("User Created!: ", username);

    const token = jwt.sign({ userId: user._id }, SCRT);
    res.send({ token });
  } catch (err) {
    // return res.send(err);
    return res.status(422).send(err.message);
  }
});

router.post("/signin", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(422)
      .send({ error: "Must provide username and password" });
  }

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(422).send({ error: "Invalid password or username" });
  }

  try {
    await user.comparePassword(password);
    const token = jwt.sign({ userId: user._id }, SCRT);
    res.send({ token, userData: user });
  } catch (err) {
    return res.status(422).send({ error: "Invalid password or username" });
  }
});

router.post("/updateuser", async (req, res) => {
  const { username, newUsername, newPassword, newAvatar } = req.body;

  try {
    // const users = await User.find({ username });
    const foundUser = await User.findOne({ username });
    console.log("foundUser", foundUser)
    const updatedUser = await User.findOneAndUpdate(
      { username },
      { username: newUsername || foundUser.username, password: newPassword || foundUser.password, avatar: newAvatar || foundUser.avatar },
      { returnNewDocument: true }
    );
    console.log(updatedUser);
    // Channel.updateMany({}, )
    res.send({ userData: updatedUser });
  } catch (err) {
    console.log(err);
    return res.status(422).send({ error: "could not find user" });
  }
});

module.exports = router;
