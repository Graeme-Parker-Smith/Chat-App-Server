const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  creator: {
    type: String,
    required: true
  },
  avatar: String,
  content: String,
  time: String,
  roomName: String,
  isImage: Boolean,
  isVideo: Boolean
});

const pmSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  creator: {
    type: String,
  },
  members: [String],
  messages: [messageSchema],
});

mongoose.model("PM", pmSchema);
