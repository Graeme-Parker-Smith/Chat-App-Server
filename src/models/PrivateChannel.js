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

const privateChannelSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	creator: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
	members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
	messages: [messageSchema],
	avatar: {
		type: String,
	},
	description: String,
	createdAt: { type: Date, default: Date.now },
	expireAt: { type: Date, default: undefined },
});

privateChannelSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

mongoose.model('PrivateChannel', privateChannelSchema);
