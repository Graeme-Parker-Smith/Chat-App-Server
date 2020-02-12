const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const requireAuth = require('../middlewares/requireAuth');
const Channel = mongoose.model('Channel');
const PrivateChannel = mongoose.model('PrivateChannel');
const PM = mongoose.model('PM');
const fs = require('fs');
const path = require('path');
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
	if (!req.user) {
		console.log('req.user is: ', req.user);
		return res.send({ error: 'user could not be found' });
	}
	const currentUser = req.user;
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
	const { username, prevName, newName, newAvatar, isPrivate } = req.body;
	try {
		if (!isPrivate) {
			const foundChannel = await Channel.findOne({ name: prevName });
			var updatedChannel = await Channel.findOneAndUpdate(
				{ name: prevName },
				{
					name: newName || foundChannel.name,
					avatar: newAvatar || foundChannel.avatar,
				},
				{ returnNewDocument: true }
			);
		} else if (isPrivate) {
			const foundChannel = await PrivateChannel.findOne({ name: prevName });
			var updatedChannel = await PrivateChannel.findOneAndUpdate(
				{ name: prevName },
				{
					name: newName || foundChannel.name,
					avatar: newAvatar || foundChannel.avatar,
				},
				{ returnNewDocument: true }
			);
		}
		res.send({ updatedChannel });
	} catch (err) {
		console.error(err);
		return res.status(422).send({ error: err });
	}
});

router.post('/addfriend', async (req, res) => {
	try {
		const { username, friendName, shouldRemove, shouldBlock } = req.body;
		if (!username || !friendName) throw 'Could not add friend';
		console.log('friendName', friendName);
		const currentUser = await User.findOne({ username });
		console.log('currentUser.username', currentUser.username);
		const friendToAdd = await User.findOne({ username: friendName, 'blocked._id': { $nin: [currentUser._id] } });
		if (!friendToAdd) throw 'could not find user with that name';
		console.log('friendToAdd', friendToAdd);
		if (!shouldRemove) {
			await User.updateOne(
				{ _id: currentUser._id },
				{
					$addToSet: { friends: friendToAdd },
					$addToSet: { pending: friendToAdd._id },
					$pull: { blocked: { _id: friendToAdd._id } },
				},
				{ returnNewDocument: true }
			);
			console.log(`${friendToAdd.username} added as a friend!`);
			await User.updateOne({ _id: friendToAdd._id }, { $addToSet: { requestsReceived: currentUser._id } });
			const foundPM = await PM.findOne({ members: { $all: [username, friendName] } });
			console.log('foundPM', foundPM);
			if (!foundPM) {
				const newPM = new PM({
					messages: [],
					members: [username, friendName],
				});
				await newPM.save();
			}
			const tokens = friendToAdd.tokens;
			tokens.forEach(token => {
				axios.post('https://exp.host/--/api/v2/push/send', {
					to: token,
					sound: 'default',
					title: 'Friend Request',
					body: `${currentUser.username} added you as a friend!`,
				});
			});
		} else if (shouldBlock) {
			await User.updateOne(
				{ _id: currentUser._id },
				{ $pull: { friends: { _id: friendToAdd._id } }, $addToSet: { blocked: friendToAdd } },
				{ returnNewDocument: true }
			);
		} else if (shouldRemove) {
			await User.updateOne(
				{ _id: currentUser._id },
				{ $pull: { friends: { _id: friendToAdd._id } } },
				{ returnNewDocument: true }
			);
		}
		const updatedUser = await User.findOne({ username });

		res.send({ currentUser: updatedUser });
	} catch (err) {
		console.log(err);
		return res.status(422).send({ error: 'could not find user with that name' });
	}
});

router.post('/unblock', async (req, res) => {
	try {
		const { username, friendName } = req.body;
		if (!username || !friendName) throw 'Could not unblock user';
		const currentUser = await User.findOne({ username });
		const userToUnblock = await User.findOne({ username: friendName });
		if (!userToUnblock) throw 'could not find user with that name';
		await User.updateOne(
			{ _id: currentUser._id },
			{ $pull: { blocked: { _id: userToUnblock._id } } },
			{ returnNewDocument: true }
		);
		console.log(`${userToUnblock.username} unblocked!`);
		const updatedUser = await User.findOne({ username });
		res.send({ currentUser: updatedUser });
	} catch (err) {
		console.log(err);
		return res.status(422).send({ error: 'could not unblock user' });
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
