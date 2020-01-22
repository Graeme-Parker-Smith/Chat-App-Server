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
  const { name, creator, avatar } = req.body;
  if (!name || !creator) {
    return res
      .status(422)
      .send({ error: "Channel must have a name and creator." });
  }
  console.log("channel name is: ", name);
  console.log("creator name is: ", creator);
  console.log("channel avatar is: ", avatar);
  // creator: req.user._id, members: [req.user._id]
  try {
    const channel = new Channel({
      name,
      creator,
      members: [creator],
      messages: [],
      avatar: avatar || ""
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

router.post("/updatechannel", async (req, res) => {
  const { username, prevName, newName, newAvatar } = req.body;
  try {
    const foundChannel = await Channel.find({ name: prevName });
    const updatedChannel = await Channel.findOneAndUpdate(
      { name: prevName },
      {
        name: newName || foundChannel.name,
        avatar: newAvatar || foundChannel.avatar
      },
      { returnNewDocument: true }
    );
    res.send({ updatedChannel });
  } catch (err) {
    console.error(err);
    return res.status(422).send({ error: err });
  }
});

module.exports = router;
