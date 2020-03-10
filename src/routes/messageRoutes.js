const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const moment = require('moment');

const requireAuth = require('../middlewares/requireAuth');
const User = mongoose.model('User');
const Channel = mongoose.model('Channel');
const PrivateChannel = mongoose.model('PrivateChannel');
const Message = mongoose.model('Message');
const PM = mongoose.model('PM');

const router = express.Router();
const io = app.get('io');

router.use(requireAuth);
const { addUser, removeUser, getUser, getUsersInRoom } = require('../helpers/userHelpers');

io.on('connection', socket => {
	console.log('a user connected to socket :D');
	app.set('socket', socket);

	socket.on('join', ({ name, room }, callback) => {
		console.log(`user joined -- user: ${name}, room: ${room}, socketId -- ${socket.id}`);
		const { error, user } = addUser({ name, room, id: socket.id });

		if (error) {
			removeUser(name);
			return callback(error);
		}

		socket.join(user.room);
		console.log('user.room', getUsersInRoom(user.room));

		io.to(user.room).emit('roomData', {
			room: user.room,
			users: getUsersInRoom(user.room),
		});

		callback();
	});

	socket.on(
		'sendMessage',
		async ({ creator, avatar, content, roomName, time, isImage, isVideo, roomType, room_id }) => {
			console.log('server receives message');
			io.in(room_id).emit('message', {
				user: creator,
				avatar: avatar,
				text: content,
				time,
				isImage,
				isVideo,
			});

			console.log('room_id', room_id);

			const filter = { _id: room_id };
			try {
				let channels;
				if (roomType === 'public') {
					channels = await Channel.find(filter);
				} else if (roomType === 'private') {
					channels = await PrivateChannel.find(filter);
				} else if (roomType === 'pm') {
					channels = await PM.find(filter);
				} else {
					console.log('no channels could be found with that filter and/or roomType');
					return;
				}
				console.log('channels', channels);
				const thisChannel = channels[0];

				let msgHasExpire = false;
				if ((!thisChannel.expireAt && thisChannel.msgLife) || thisChannel.msgLife > thisChannel.expireAt) {
					msgHasExpire = true;
				}

				const newMessage = new Message({
					creator,
					avatar,
					content,
					roomName,
					time,
					isImage,
					isVideo,
					channel: thisChannel._id,
					expireAt: msgHasExpire ? moment().add(thisChannel.msgLife, 'minutes') : thisChannel.expireAt,
				});
				await newMessage.save();
				console.log('message saved!');
				await User.findOneAndUpdate({ username: creator }, { $inc: { msgsSent: 1 } });
			} catch (err) {
				console.log(err);
			}
		}
	);

	socket.on('leave', ({ room, name }) => {
		console.log('user has left');
		const user = removeUser(name);
		if (user) {
			io.to(user.room).emit('roomData', {
				room: user.room,
				users: getUsersInRoom(user.room),
			});
		}
		socket.leave(room);
	});

	socket.on('usersearch', async ({ currentUser, searchKey }) => {
		const searchResults = await User.find({ username: { $regex: searchKey } });
		const results = searchResults.filter(r => {
			if (r.blocked.some(user => `${user._id}` === `${currentUser._id}`)) return false;
			return true;
		});
		socket.emit('usersearch', { results });
	});

	router.get('/messages', async (req, res) => {
		const { roomName, roomType, room_id } = req.query;
		const filter = { _id: room_id };
		// let channels;
		// if (roomType === 'public') {
		// 	channels = await Channel.find(filter);
		// } else if (roomType === 'private') {
		// 	channels = await PrivateChannel.find(filter);
		// } else if (roomType === 'pm') {
		// 	channels = await PM.find({ members: { $all: room_id } });
		// } else {
		// 	console.log('no channels could be found with that filter and/or roomType');
		// 	return;
		// }
		// const thisChannel = channels[0];
		const username = req.user.username;
		let allMessages = await Message.find({ channel: room_id });
		let messages;
		if (req.query.stateLength) {
			if (allMessages.length - req.query.stateLength < 10) {
				messages = allMessages;
			} else {
				messages = allMessages.slice(Math.max(allMessages.length - req.query.stateLength - 10, 1));
			}
		} else if (allMessages.length < 20) {
			messages = allMessages;
		} else {
			messages = allMessages.slice(Math.max(allMessages.length - 19, 1));
		}
		console.log('messages fetched length is: ', messages.length);
		// console.log("req.user is: ", req.user);
		// const allUsers = getUsersInRoom(thisChannel);
		res.send({ messages, username });
	});

	router.post('/sendnotification', async (req, res) => {
		console.log('server receives pm');
		try {
			const { sender, messageBody, receiver } = req.body;
			const sendingUser = await User.findOne({ _id: sender });
			const foundUser = await User.findOne({ _id: receiver, 'blocked._id': { $nin: [sendingUser._id] } });
			console.log('foundUser', foundUser);
			if (!foundUser.tokens || foundUser.tokens < 1) throw 'User has no tokens. Cannot send notification';
			foundUser.tokens.forEach(token => {
				axios.post('https://exp.host/--/api/v2/push/send', {
					to: token,
					sound: 'default',
					title: sendingUser.username,
					body: messageBody,
				});
			});
		} catch (err) {
			console.log(err);
		}
	});

	router.post('/messages', async (req, res) => {
		const { creator, content, roomName, time, isImage, isVideo } = req.body;

		console.log('roomName is: ', roomName);
		const filter = { name: roomName };
		try {
			const channels = await Channel.find(filter);
			const thisChannel = channels[0];
			const users = await User.find({ username: creator });
			const thisUser = users[0];

			thisChannel.messages.push({
				creator,
				avatar: thisUser.avatar,
				content,
				roomName,
				time,
				isImage,
				isVideo,
			});
			await thisChannel.save();

			console.log('message saved!');
			res.send({
				creator,
				avatar: thisUser.avatar,
				content,
				roomName,
				time,
				isImage,
				isVideo,
			});
		} catch (err) {
			console.log('problem pushing message to channel');
			res.status(422).send({ error: err.message });
		}
	});
});

router.put('/messages', async (req, res) => {
	const { currentContent, newContent, itemId } = req.body;
	// need to set MessageSchema as mongoose model
	await Message.findOneAndUpdate({ _id: itemId }, { $set: { content: newContent } });
	const thisMessage = await Message.findOne({ _id: itemId });
	res.send({ updatedMessage: thisMessage });
});

router.delete('/messages', async (req, res) => {
	const { itemId } = req.query;
	console.log('req.query', req.query);
	await Message.findOneAndDelete({ _id: itemId });
	res.send({ success: 'Message Deleted!' });
});

module.exports = router;
