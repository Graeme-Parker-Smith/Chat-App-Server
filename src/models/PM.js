const mongoose = require('mongoose');

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
	expireAt: { type: Date, default: undefined },
	msgLife: { type: Number, default: undefined },
});

const pmSchema = new mongoose.Schema({
	members: [String],
	messages: [messageSchema],
});

mongoose.model('PM', pmSchema);
