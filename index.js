const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);


app.get('/', () => {
  res.send('<h1>Greetings from the graeme-chat-app server!</h1>')
})

io.on("connection", socket => {
  console.log("a user connected :D");
  socket.on("join", ({ name, room }, callback) => {
    console.log(`user joined -- user: ${name}, room: ${room}`);
  });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
