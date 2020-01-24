const express = require("express");
const mongoose = require("mongoose");
const requireAuth = require("../middlewares/requireAuth");
const Channel = mongoose.model("Channel");
const User = mongoose.model("User");

const router = express.Router();
const io = app.get("io");

router.use(requireAuth);
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
} = require("../helpers/userHelpers");

io.on("connection", socket => {
  console.log("a user connected to socket :D");
  app.set("socket", socket);

  socket.on("join", ({ name, room }, callback) => {
    console.log(
      `user joined -- user: ${name}, room: ${room}, socketId -- ${socket.id}`
    );
    const { error, user } = addUser({ name, room, id: socket.id });

    if (error) {
      removeUser(name);
      return callback(error);
    }

    socket.join(user.room);

    // socket.emit("message", {
    //   user: "Admin",
    //   text: `${user.name}, welcome to the room ${user.room}`
    // });
    // socket.broadcast.to(user.room).emit("message", {
    //   user: "Admin",
    //   text: `${user.name} has joined!`
    // });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    callback();
  });

  socket.on(
    "sendMessage",
    ({ creator, avatar, content, roomName, isImage, isVideo }) => {
      console.log("server receives message");
      io.in(roomName).emit("message", {
        user: creator,
        avatar: avatar,
        text: content,
        isImage,
        isVideo
      });
    }
  );

  socket.on("leave", ({ room, name }) => {
    console.log("user has left");
    const user = removeUser(name);
    if (user) {
      // io.to(user.room).emit("message", {
      //   user: "Admin",
      //   text: `${user.name} has left.`
      // });
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
    socket.leave(room);
  });

  router.get("/messages", async (req, res) => {
    const channels = await Channel.find({ name: req.query.roomName });
    const thisChannel = channels[0];
    const username = req.user.username;
    let messages;
    if (req.query.stateLength) {
      messages = thisChannel.messages.slice(
        Math.max(thisChannel.messages.length - req.query.stateLength - 10, 1)
      );
    } else if (thisChannel.messages.length < 20) {
      messages = thisChannel.messages;
    } else {
      messages = thisChannel.messages.slice(
        Math.max(thisChannel.messages.length - 19, 1)
      );
    }
    console.log("messages fetched length is: ", messages.length);
    // console.log("req.user is: ", req.user);
    // const allUsers = getUsersInRoom(thisChannel);
    res.send({ messages, username });
  });

  router.post("/pm", async (req, res) => {
    console.log("server receives pm");
  });

  router.post("/messages", async (req, res) => {
    const { creator, content, roomName, time, isImage, isVideo } = req.body;

    console.log("roomName is: ", roomName);
    const filter = { name: roomName };
    try {
      const channels = await Channel.find(filter);
      const thisChannel = channels[0];
      const users = await User.find({ username: creator });
      const thisUser = users[0];

      thisChannel.messages.push({
        creator,
        avatar: thisUser.avatar,
        content,
        roomName,
        time,
        isImage,
        isVideo
      });
      await thisChannel.save();

      console.log("message saved!");
      res.send({
        creator,
        avatar: thisUser.avatar,
        content,
        roomName,
        time,
        isImage,
        isVideo
      });
    } catch (err) {
      console.log("problem pushing message to channel");
      res.status(422).send({ error: err.message });
    }
  });
});

module.exports = router;
