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
// socket.on("join", ({ name, room }, callback) => {
//   console.log(`user joined -- user: ${name}, room: ${room}`);
// });

io.on("connection", socket => {
  console.log("a user connected to socket :D");
  app.set("socket", socket);

  socket.on("join", ({ name, room }, callback) => {
    console.log(
      `user joined -- user: ${name}, room: ${room}, socketId -- ${socket.id}`
    );
    const { error, user } = addUser({ name, room, id: socket.id });

    if (error) return callback(error);

    socket.join(user.room);

    socket.emit("message", {
      user: "Admin",
      text: `${user.name}, welcome to the room ${user.room}`
    });
    socket.broadcast.to(user.room).emit("message", {
      user: "Admin",
      text: `${user.name} has joined!`
    });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    callback();
  });

  socket.on("sendMessage", ({ creator, content, roomName }) => {
    console.log("server receives message");
    io.in(roomName).emit("message", {
      user: creator,
      text: content
    });
  });

  socket.on("leave", ({ room }) => {
    console.log("user has left");
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "Admin",
        text: `${user.name} has left.`
      });
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
    const messages = thisChannel.messages.slice(
      Math.max(thisChannel.messages.length - 19, 1)
    );
    // console.log("req.user is: ", req.user);
    const allUsers = getUsersInRoom(thisChannel);

    res.send({ messages, username });
  });

  router.post("/messages", async (req, res) => {
    const { creator, content, roomName, time } = req.body;
    const userId = req.user._id;
    // if (!name || !userId) {
    //   return res.status(422).send({ error: "Channel must have a name and creator." });
    // }
    // creator: req.user._id, members: [req.user._id]

    console.log("roomName is: ", roomName);
    const filter = { name: roomName };
    try {
      // const channel = new Channel({
      //   name,
      //   creator: userId,
      //   members: [],
      //   messages: []
      // });
      // await channel.save();
      const channels = await Channel.find(filter);
      const thisChannel = channels[0];
      const allUsers = getUsersInRoom(thisChannel);

      thisChannel.messages.push({ creator, content, roomName, time });
      await thisChannel.save();


      console.log("message saved!");
      res.send({ creator, content, roomName, time });
    } catch (err) {
      console.log("problem pushing message to channel");
      res.status(422).send({ error: err.message });
    }
  });
});

module.exports = router;
