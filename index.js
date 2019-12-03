const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const port = 3000;

io.on("connection", socket => {
  console.log("a user connected :D");
  socket.on("join", ({ name, room }, callback) => {
    console.log(`user joined -- user: ${name}, room: ${room}`);
  });
});

server.listen(port, () => console.log(`Server running on port ${port}`));
