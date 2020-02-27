const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
	creator: {
		type: String,
		required: true,
	},
	avatar: String,
	content: String,
	time: String,
	roomName: String,
	isImage: Boolean,
	isVideo: Boolean,
	createdAt: { type: Date, default: Date.now },
	expireAt: { type: Date, default: undefined },
});

messageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const privateChannelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  creator: {
    type: String,
    required: true
  },
  members: [String],
  messages: [messageSchema],
  avatar: {
    type: String
  },
});

mongoose.model("PrivateChannel", privateChannelSchema);
