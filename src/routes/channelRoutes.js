const express = require("express");
const mongoose = require("mongoose");
const requireAuth = require("../middlewares/requireAuth");
const Channel = mongoose.model("Channel");
const User = mongoose.model("User");

const router = express.Router();

router.use(requireAuth);

router.get("/channels", async (req, res) => {
  const channels = await Channel.find({});
  // const user = await User.findById(req.user_id);
  // console.log("req.user: ", req.user);
  const currentUser = req.user;
  // console.log("req.user is: ", req.user);
  console.log("username is: ", currentUser.username);

  res.send({ channels, currentUser });
});

router.post("/channels", async (req, res) => {
  const { name, creator } = req.body;
  if (!name || !creator) {
    return res
      .status(422)
      .send({ error: "Channel must have a name and creator." });
  }
  console.log("channel name is: ", name);
  console.log("creator name is: ", creator);
  // creator: req.user._id, members: [req.user._id]
  try {
    const channel = new Channel({
      name,
      creator,
      members: [creator],
      messages: []
    });
    await channel.save();
    console.log("Channel saved!");
    console.log(channel);
    res.send(channel);
  } catch (err) {
    console.log("problem creating channel");
    res.status(422).send({ error: err.message });
  }
});

module.exports = router;
