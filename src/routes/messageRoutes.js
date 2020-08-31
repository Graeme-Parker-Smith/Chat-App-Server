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
const ReportedUser = mongoose.model('ReportedUser');

const router = express.Router();
const io = app.get('io');

router.use(requireAuth);
let idList = {};
const { addUser, removeUser, getUser, getUsersInRoom, countUsers } = require('../helpers/userHelpers');

io.on('connection', (socket) => {
	router.post('/addfriend', async (req, res) => {
		try {
			const { username, friendName, shouldRemove, shouldBlock, shouldReport } = req.body;
			if (!username || !friendName) throw 'Could not add friend';
			console.log('friendName', friendName);
			const currentUser = await User.findOne({ username });
			console.log('currentUser.username', currentUser.username);
			const friendToAdd = await User.findOne({
				username: friendName,
				'blocked._id': { $nin: [currentUser._id] },
			});
			if (!friendToAdd) throw 'could not find user with that name';
			if (!shouldRemove) {
				// if added friend does not have current user added
				let imAddingFirst = !friendToAdd.pending.some((f) => {
					console.log('f._id', f._id);
					console.log('currentUser._id', currentUser._id);
					console.log('f._id === currentUser._id', `${f._id}` === `${currentUser._id}`);
					return `${f._id}` === `${currentUser._id}`;
				});
				console.log('imAddingFirst: ', imAddingFirst);
				if (imAddingFirst) {
					// update user
					await User.updateOne(
						{ _id: currentUser._id },
						{
							$addToSet: {
								pending: {
									username: friendToAdd.username,
									_id: friendToAdd._id,
									avatar: friendToAdd.avatar,
								},
							},
							$pull: { blocked: { _id: friendToAdd._id } },
						}
					);
					// update friend
					await User.updateOne(
						{ _id: friendToAdd._id },
						{
							$addToSet: {
								requestsReceived: {
									username: currentUser.username,
									_id: currentUser._id,
									avatar: currentUser.avatar,
								},
							},
						}
					);

					const channels = await Channel.find({});
					const privateChannels = await PrivateChannel.find({
						members: friendToAdd._id,
					});
					const PMs = await PM.find({
						members: friendToAdd._id,
					});
					const updatedFriend = await User.findOne({ _id: friendToAdd._id });
					socket.broadcast.to(idList[friendToAdd._id]).emit('update_user', {
						newData: { channels, privateChannels, PMs, currentUser: updatedFriend },
					});
					const tokens = friendToAdd.tokens;
					tokens.forEach((token) => {
						axios.post('https://exp.host/--/api/v2/push/send', {
							to: token,
							sound: 'default',
							title: imAddingFirst ? 'Friend Request' : 'New Friend!',
							body: imAddingFirst
								? `${currentUser.username} sent you a friend request!`
								: `${currentUser.username} added you as a friend!`,
							_displayInForeground: true,
							data: { destination: 'Dash', initialIndex: imAddingFirst ? 2 : 1 },
						});
					});
				} else {
					// if friend being added has already sent request to user
					// update user
					await User.updateOne(
						{ _id: currentUser._id },
						{
							$addToSet: {
								friends: {
									username: friendToAdd.username,
									_id: friendToAdd._id,
									avatar: friendToAdd.avatar,
								},
							},
							$pull: { blocked: { _id: friendToAdd._id }, requestsReceived: { _id: friendToAdd._id } },
						}
					);
					// update friend
					await User.updateOne(
						{ _id: friendToAdd._id },
						{
							$addToSet: {
								friends: {
									username: currentUser.username,
									_id: currentUser._id,
									avatar: currentUser.avatar,
								},
							},
							$pull: { pending: { _id: currentUser._id } },
						}
					);
				}
				console.log(`${friendToAdd.username} added as a friend!`);
				const foundPM = await PM.findOne({ members: { $all: [currentUser._id, friendToAdd._id] } });
				if (!foundPM) {
					const newPM = new PM({
						messages: [],
						members: [currentUser._id, friendToAdd._id],
					});
					await newPM.save();
				}
				console.log('friend id', idList[friendToAdd._id]);
				const channels = await Channel.find({});
				const privateChannels = await PrivateChannel.find({
					members: friendToAdd._id,
				});
				const PMs = await PM.find({
					members: friendToAdd._id,
				});
				const updatedFriend = await User.findOne({ _id: friendToAdd._id });
				socket.broadcast
					.to(idList[friendToAdd._id])
					.emit('update_user', { newData: { channels, privateChannels, PMs, currentUser: updatedFriend } });
				const tokens = friendToAdd.tokens;
				tokens.forEach((token) => {
					axios.post('https://exp.host/--/api/v2/push/send', {
						to: token,
						sound: 'default',
						title: imAddingFirst ? 'Friend Request' : 'New Friend!',
						body: imAddingFirst
							? `${currentUser.username} sent you a friend request!`
							: `${currentUser.username} added you as a friend!`,
						_displayInForeground: true,
						data: { destination: 'Dash', initialIndex: imAddingFirst ? 2 : 1 },
					});
				});
			} else if (shouldBlock) {
				await User.updateOne(
					{ _id: currentUser._id },
					{
						$pull: {
							friends: { _id: friendToAdd._id },
							pending: { _id: friendToAdd._id },
							requestsReceived: { _id: friendToAdd._id },
						},
						$addToSet: {
							blocked: {
								username: friendToAdd.username,
								_id: friendToAdd._id,
								avatar: friendToAdd.avatar,
							},
						},
					}
				);
				// if user was reported do this
				if (shouldReport) {
					await User.updateOne({ _id: friendToAdd._id }, { $push: { reportedBy: currentUser._id } });
				}
				await User.updateOne(
					{ _id: friendToAdd._id },
					{
						$pull: {
							friends: { _id: currentUser._id },
							pending: { _id: currentUser._id },
							requestsReceived: { _id: currentUser._id },
						},
					}
				);
				const channels = await Channel.find({});
				const privateChannels = await PrivateChannel.find({
					members: friendToAdd._id,
				});
				const PMs = await PM.find({
					members: friendToAdd._id,
				});
				const updatedFriend = await User.findOne({ _id: friendToAdd._id });
				socket.broadcast
					.to(idList[friendToAdd._id])
					.emit('update_user', { newData: { channels, privateChannels, PMs, currentUser: updatedFriend } });
			} else if (shouldRemove) {
				await User.updateOne(
					{ _id: currentUser._id },
					{ $pull: { friends: { _id: friendToAdd._id }, pending: { _id: friendToAdd._id } } }
				);
				await User.updateOne(
					{ _id: friendToAdd._id },
					{ $pull: { friends: { _id: currentUser._id }, requestsReceived: { _id: currentUser._id } } }
				);
			}

			const channels = await Channel.find({});
			const privateChannels = await PrivateChannel.find({
				members: friendToAdd._id,
			});
			const PMs = await PM.find({
				members: friendToAdd._id,
			});
			const updatedFriend = await User.findOne({ _id: friendToAdd._id });
			socket.broadcast
				.to(idList[friendToAdd._id])
				.emit('update_user', { newData: { channels, privateChannels, PMs, currentUser: updatedFriend } });

			const updatedUser = await User.findOne({ username });

			socket.broadcast
				.to(idList[currentUser._id])
				.emit('update_user', { newData: { channels, privateChannels, PMs, currentUser: updatedUser } });

			res.send({ currentUser: updatedUser });
		} catch (err) {
			console.log(err);
			return res.status(422).send({ error: 'could not find user with that name' });
		}
	});

	console.log('a user connected to socket :D');
	app.set('socket', socket);

	socket.on('register_socket', ({ userId }) => {
		idList[userId] = socket.id;
		// console.log('idList', idList);
	});

	socket.on('get_channels_data', ({ socketId }) => {
		let channelsData = countUsers();
		io.to(socketId).emit('channelsData', { channelsData });
	});

	socket.on('join', ({ name, userId, room }, callback) => {
		console.log(`user joined -- user: ${name}, room: ${room}, socketId -- ${socket.id}`);
		const { error, user } = addUser({ name, room, id: userId });

		if (error) {
			removeUser(name);
			return callback(error);
		}

		socket.join(user.room);
		// console.log('user.room', getUsersInRoom(user.room));

		let channelsData = countUsers();
		console.log('channelsData', channelsData);
		io.emit('channelsData', { channelsData });
		if (room !== socket.id) {
			console.log('users in room', getUsersInRoom(user.room));
			io.to(user.room).emit('roomData', {
				room: user.room,
				users: getUsersInRoom(user.room),
			});
		}

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
		let channelsData = countUsers();
		console.log('channelsData', channelsData);
		io.emit('channelsData', { channelsData });
	});

	socket.on('usersearch', async ({ currentUser, searchKey }) => {
		const searchResults = await User.find({ username: { $regex: searchKey } });
		const results = searchResults.filter((r) => {
			if (r.blocked.some((user) => `${user._id}` === `${currentUser._id}`)) return false;
			return true;
		});
		socket.emit('usersearch', { results });
	});

	router.get('/messages', async (req, res) => {
		try {
			const { roomName, roomType, room_id } = req.query;
			console.log('roomId', room_id);
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
			// for fetchEarlierMessages
			if (req.query.stateLength) {
				if (allMessages.length - req.query.stateLength < 10) {
					messages = allMessages;
				} else {
					messages = allMessages.slice(Math.max(allMessages.length - req.query.stateLength - 10, 1));
				}
				// for fetchMessages
			} else if (allMessages.length < 20) {
				messages = allMessages;
			} else {
				messages = allMessages.slice(Math.max(allMessages.length - 19, 1));
			}
			console.log('messages fetched length is: ', messages.length);
			// console.log("req.user is: ", req.user);
			// const allUsers = getUsersInRoom(thisChannel);
			res.send({ messages, username });
		} catch (err) {
			console.log(err);
		}
	});

	router.post('/sendnotification', async (req, res) => {
		console.log('server receives pm');
		try {
			const { sender, messageBody, receiver, room_id } = req.body;
			const sendingUser = await User.findOne({ _id: sender });
			const foundUser = await User.findOne({ _id: receiver, 'blocked._id': { $nin: [sendingUser._id] } });
			const foundPM = await PM.findOne({ _id: room_id });
			if (!foundPM) throw 'could not find PM object matching given id';
			const usersInThisRoom = getUsersInRoom(room_id);
			if (usersInThisRoom.some((user) => String(user.id) === String(foundUser._id))) {
				console.log('notification blocked.');
				return;
			}
			if (!foundUser.tokens || foundUser.tokens < 1) throw 'User has no tokens. Cannot send notification';
			foundUser.tokens.forEach((token) => {
				axios.post('https://exp.host/--/api/v2/push/send', {
					to: token,
					sound: 'default',
					title: sendingUser.username,
					body: messageBody,
					_displayInForeground: true,
					data: { destination: 'Account', initialIndex: 0 },
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

	router.post('/invite', async (req, res) => {
		const { invitee, roomName } = req.body;
		console.log('roomName', roomName);
		try {
			const foundInvitee = await User.findOne({ username: invitee });
			if (!foundInvitee) throw 'could not find invitee';
			const updatedChannel = await PrivateChannel.updateOne(
				{ name: roomName },
				{ $push: { members: foundInvitee._id } }
			);
			console.log(invitee, 'added!');
			console.log('updatedChannel', updatedChannel);
			socket.broadcast.to(idList[foundInvitee._id]).emit('invite', { roomName, invitee });
			res.send({ updatedChannel });
		} catch (err) {
			console.log(err);
			return res.status(422).send({ error: 'could not find user with that name' });
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
	await Message.findOneAndDelete({ _id: itemId });
	res.send({ success: 'Message Deleted!' });
});

router.put('/kick', async (req, res) => {
	const { removee, roomName } = req.body;
	try {
		const foundRemovee = await User.findOne({ username: removee });
		if (!foundRemovee) throw 'could not find removee';
		const updatedChannel = await PrivateChannel.updateOne(
			{ name: roomName },
			{ $pull: { members: foundRemovee._id } }
		);
		const user = getUser(removee);
		io.in(user.room).emit('kick', { roomName, removee });
		res.send({ updatedChannel });
	} catch (err) {
		console.log(err);
		return res.status(422).send({ error: 'could not find user with that name' });
	}
});

module.exports = router;
