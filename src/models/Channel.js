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
});

const channelSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	creator: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
	messages: [messageSchema],
	avatar: {
		type: String,
	},
	description: String,
	createdAt: { type: Date, default: Date.now },
	expireAt: { type: Date, default: undefined },
	msgLife: Number,
});

channelSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

mongoose.model('Channel', channelSchema);
