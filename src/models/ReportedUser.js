const mongoose = require('mongoose');

const reportedUserSchema = new mongoose.Schema({
	username: {
		type: String,
		unique: true,
		required: true,
	},
	password: {
		type: String,
		required: true,
	},
	avatar: String,
	friends: Array,
	requestsReceived: Array,
	pending: Array,
	blocked: Array,
	tokens: Array,
	mentions: Array,
	msgsSent: {
		type: Number,
		default: 0
	},
	notificationsEnabled: Boolean,
	createdAt: String,
});




mongoose.model('ReportedUser', reportedUserSchema);
