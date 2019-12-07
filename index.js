require("./src/models/User");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const authRoutes = require("./src/routes/authRoutes");
const requireAuth = require("./src/middlewares/requireAuth");
const cors = require("cors");

const app = express();
const server = require("http").Server(app);
console.log(server);
const io = require("socket.io")(server);

app.use(cors());
app.use(bodyParser.json());
app.use(authRoutes);
const mongoUri =
  "mongodb+srv://kowtowbilly:skarjackhammer455@cluster0-iccqs.mongodb.net/test?retryWrites=true&w=majority"; // process.env.mongoString
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true
});
mongoose.connection.on("connected", () => {
  console.log("Connected to mongo instance");
});
mongoose.connection.on("error", err => {
  console.error("Error connecting to mongo", err);
});

// app.post('/signin', (req, res) => {
//   console.log("You just signed in!")
// })
// app.post('/signup', (req, res) => {
//   console.log("You just signed up bruh???")
// })

io.on("connection", socket => {
  console.log("a user connected to socket :D");
  socket.on("join", ({ name, room }, callback) => {
    console.log(`user joined -- user: ${name}, room: ${room}`);
  });
});

app.get("/", (req, res) => {
  res.send("<h1>Greetings from the graeme-chat-app server!</h1>");
  console.log("Get Root Route!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
