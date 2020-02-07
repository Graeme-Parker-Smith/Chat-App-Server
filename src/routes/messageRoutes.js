const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');
const User = mongoose.model('User');
const Channel = mongoose.model('Channel');
const PrivateChannel = mongoose.model('PrivateChannel');
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
					channels = await PM.find({ members: { $all: room_id } });
				} else {
					console.log('no channels could be found with that filter and/or roomType');
					return;
				}
				const thisChannel = channels[0];
				// not recommended. Use Channel.updateOne instead
				thisChannel.messages.push({
					creator,
					avatar,
					content,
					roomName,
					time,
					isImage,
					isVideo,
				});
				await thisChannel.save();
				console.log('message saved!');
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

	router.get('/messages', async (req, res) => {
		const { roomName, roomType, room_id } = req.query;
		const filter = { _id: room_id };
		let channels;
		if (roomType === 'public') {
			channels = await Channel.find(filter);
		} else if (roomType === 'private') {
			channels = await PrivateChannel.find(filter);
		} else if (roomType === 'pm') {
			channels = await PM.find({ members: { $all: room_id } });
		} else {
			console.log('no channels could be found with that filter and/or roomType');
			return;
		}
		const thisChannel = channels[0];
		const username = req.user.username;
		let messages;
		if (req.query.stateLength) {
			if (thisChannel.messages.length - req.query.stateLength < 10) {
				messages = thisChannel.messages;
			} else {
				messages = thisChannel.messages.slice(
					Math.max(thisChannel.messages.length - req.query.stateLength - 10, 1)
				);
			}
		} else if (thisChannel.messages.length < 20) {
			messages = thisChannel.messages;
		} else {
			messages = thisChannel.messages.slice(Math.max(thisChannel.messages.length - 19, 1));
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
			const foundUser = await User.findOne({ username: receiver });
			const tokens = foundUser.tokens;
			tokens.forEach(token => {
				axios.post('https://exp.host/--/api/v2/push/send', {
					to: token,
					sound: 'default',
					title: sender,
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

module.exports = router;
