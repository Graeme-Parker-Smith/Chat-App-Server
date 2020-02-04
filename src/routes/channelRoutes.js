const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middlewares/requireAuth');
const Channel = mongoose.model('Channel');
const PrivateChannel = mongoose.model('PrivateChannel');
const PM = mongoose.model('PM');
const fs = require('fs');
const path = require('path');
// const filePath = path.join(process.cwd(), '/uploads/824128849df5344f3615904d6a4fabef');
const User = mongoose.model('User');
const Img = mongoose.model('Img');

const router = express.Router();

router.use(requireAuth);

router.get('/images', async (req, res) => {
	const { avatarId } = req.query;
	console.log('aId', avatarId);
	const foundImgs = await Img.find({ _id: avatarId });
	const buffer = foundImgs[0].img.data;
	console.log(buffer);
	res.send(buffer);
});

router.get('/channels', async (req, res) => {
	console.log('req.user is: ', req.user);
	if (!req.user) {
		return res.send({ error: 'user could not be found' });
	}
	const currentUser = req.user;
	// let userAvatar;
	// fs.readFile(filePath, { encoding: null }, function(err, data) {
	// 	if (!err) {
	// 		userAvatar = data;
	// 		console.log(data);
	// 	} else {
	// 		console.log(err);
	// 	}
	// });
	// console.log('userAvatar', userAvatar);
	const channels = await Channel.find({});
	const privateChannels = await PrivateChannel.find({
		members: currentUser.username,
	});
	const PMs = await PM.find({
		members: currentUser.username,
	});

	console.log('username is: ', currentUser.username);

	res.send({ channels, privateChannels, PMs, currentUser });
});

router.post('/channels', async (req, res) => {
	const { name, creator, avatar } = req.body;
	if (!name || !creator) {
		return res.status(422).send({ error: 'Channel must have a name and creator.' });
	}
	console.log('channel name is: ', name);
	console.log('creator name is: ', creator);
	console.log('channel avatar is: ', avatar);
	// creator: req.user._id, members: [req.user._id]
	try {
		const channel = new Channel({
			name,
			creator,
			messages: [],
			avatar: avatar || '',
		});
		await channel.save();
		console.log('Channel saved!');
		console.log(channel);
		res.send(channel);
	} catch (err) {
		console.log('problem creating channel');
		res.status(422).send({ error: err.message });
	}
});

router.post('/privatechannels', async (req, res) => {
	const { name, creator, avatar } = req.body;
	if (!name || !creator) {
		return res.status(422).send({ error: 'Channel must have a name and creator.' });
	}
	console.log('channel name is: ', name);
	console.log('creator name is: ', creator);
	console.log('channel avatar is: ', avatar);
	// creator: req.user._id, members: [req.user._id]
	try {
		const channel = new PrivateChannel({
			name,
			creator,
			messages: [],
			members: [creator],
			avatar: avatar || '',
		});
		await channel.save();
		console.log('Private Channel saved!');
		console.log(channel);
		res.send(channel);
	} catch (err) {
		console.log('problem creating channel');
		res.status(422).send({ error: err.message });
	}
});

router.post('/updatechannel', async (req, res) => {
	const { username, prevName, newName, newAvatar } = req.body;
	try {
		const foundChannel = await Channel.findOne({ name: prevName });
		const updatedChannel = await Channel.findOneAndUpdate(
			{ name: prevName },
			{
				name: newName || foundChannel.name,
				avatar: newAvatar || foundChannel.avatar,
			},
			{ returnNewDocument: true }
		);
		res.send({ updatedChannel });
	} catch (err) {
		console.error(err);
		return res.status(422).send({ error: err });
	}
});

router.post('/addfriend', async (req, res) => {
	const { username, friendName } = req.body;
	console.log('friendName', friendName);
	try {
		const currentUser = await User.findOne({ username });
		console.log('currentUser.username', currentUser.username);
		const friendToAdd = await User.findOne({ username: friendName });
		console.log('friendToAdd', friendToAdd);
		const updatedUser = await User.updateOne(
			{ _id: currentUser._id },
			{ $push: { friends: friendToAdd } },
			{ returnNewDocument: true }
		);
		console.log(`${friendToAdd.username} added as a friend! CurrentUser data is now: ${updatedUser}`);
		const newPM = new PM({
			messages: [],
			members: [username, friendName],
		});
		await newPM.save();
		const PMs = await PM.find({});
		console.log('PMs is: ', PMs);
		res.send({ currentUser: updatedUser, PMs });
	} catch (err) {
		console.log(err);
		return res.status(422).send({ error: 'could not find user with that name' });
	}
});

router.post('/invite', async (req, res) => {
	const { invitee, roomName } = req.body;
	console.log('roomName', roomName);
	try {
		const updatedChannel = await PrivateChannel.updateOne({ name: roomName }, { $push: { members: invitee } });
		console.log(invitee, 'added!');
		console.log('updatedChannel', updatedChannel);
		res.send({ updatedChannel });
	} catch (err) {
		console.log(err);
		return res.stats(422).send({ error: 'could not find user with that name' });
	}
});

module.exports = router;
