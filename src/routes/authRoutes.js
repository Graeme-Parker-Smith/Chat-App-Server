const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = mongoose.model("User");
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

// router.get("/userdata", async (req, res) => {
//   console.log("req is: ", req);
//   const username = req.user.username;

//   try {
//     const users = await User.find({ username });
//     const thisUser = users[0];

//     res.send({ userData: thisUser });
//   } catch (err) {
//     return res.status(422).send({ error: "could not find user" });
//   }
// });

module.exports = router;
