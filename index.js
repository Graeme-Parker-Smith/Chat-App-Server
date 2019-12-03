const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const port = 3000;

app.get('/', () => {
  res.send('<h1>Greetings from the graeme-chat-app server!</h1>')
})

io.on("connection", socket => {
  console.log("a user connected :D");
  socket.on("join", ({ name, room }, callback) => {
    console.log(`user joined -- user: ${name}, room: ${room}`);
  });
});

server.listen(port, () => console.log(`Server running on port ${port}`));
