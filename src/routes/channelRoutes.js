const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const requireAuth = require('../middlewares/requireAuth');
const Channel = mongoose.model('Channel');
const PrivateChannel = mongoose.model('PrivateChannel');
const PM = mongoose.model('PM');
const Message = mongoose.model('Message');
const fs = require('fs');
const path = require('path');
const User = mongoose.model('User');
const Img = mongoose.model('Img');
const io = app.get('io');

const moment = require('moment');

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

	const addMessageLengths = async (channelList) => {
		let result = [];
		for (const chan of channelList) {
			// if (channelList.length === 3) {
			// console.log('chan', chan);
			// }
			let thisChansMessages = await Message.countDocuments({ channel: chan._doc ? chan._doc._id : chan._id });
			// console.log('thiscm', thisChansMessages);
			let moarChan;
			if (chan._doc) {
				moarChan = { ...chan._doc, msgCount: thisChansMessages };
			} else {
				moarChan = { ...chan, msgCount: thisChansMessages };
			}
			// console.log('moarChan', moarChan);
			await result.push(moarChan);
			if (moarChan.members) {
				// console.log('result', result);
			}
		}
		return result;
	};
	const privateChannels = await PrivateChannel.find({
		members: currentUser._id,
	});
	const moarChannels = await addMessageLengths(channels);
	const moarPrivates = await addMessageLengths(privateChannels);
	const PMs = await PM.find({
		members: currentUser._id,
	});
	const moarPMs = await addMessageLengths(PMs);
	// let moarPMs = [];
	// await PMs.forEach(async (chan) => {
	// 	let thisChansMessages = await Message.countDocuments({ channel: chan._doc ? chan._doc._id : chan._id });
	// 	let moarChan;
	// 	if (chan._doc) {
	// 		moarChan = { ...chan._doc, msgCount: thisChansMessages };
	// 	} else {
	// 		moarChan = { ...chan, msgCount: thisChansMessages };
	// 	}
	// 	moarPMs.push(moarChan);
	// 	// console.log("moarChan", moarChan)
	// });
	// console.log('channels', moarChannels);
	console.log('username is: ', currentUser.username);
	res.send({ channels: moarChannels, privateChannels: moarPrivates, PMs: moarPMs, currentUser });
});

router.post('/channels', async (req, res) => {
	const { name, creator, avatar, description, lifespan, msgLife } = req.body;
	const foundCreator = await User.findOne({ username: creator });
	if (!name || !creator || !foundCreator) {
		return res.status(422).send({ error: 'Channel must have a name and creator.' });
	}
	console.log('channel name is: ', name);
	console.log('creator name is: ', creator);
	console.log('channel avatar is: ', avatar);
	console.log('lifespan: ', lifespan);
	console.log('msgLife: ', msgLife);
	console.log('creator id', foundCreator);
	try {
		const channel = new Channel({
			name,
			creator: foundCreator._id,
			messages: [],
			avatar: avatar || '',
			description,
			expireAt: lifespan ? moment().add(lifespan, 'minutes') : undefined,
			msgLife: msgLife,
		});
		await channel.save();
		console.log('Channel saved!');
		res.send(channel);
	} catch (err) {
		console.log('problem creating channel', err);
		if (err.message.includes('duplicate key')) {
			res.send({ error: 'Channel Name Taken.' });
		} else {
			res.send({ error: 'Unable to Create Channel.' });
		}
	}
});

router.post('/privatechannels', async (req, res) => {
	const { name, creator, avatar, lifespan, msgLife } = req.body;
	const foundCreator = await User.findOne({ username: creator });
	console.log('foundCreator', foundCreator);
	if (!name || !creator || !foundCreator) {
		return res.status(422).send({ error: 'Channel must have a name and creator.' });
	}
	console.log('channel name is: ', name);
	console.log('creator name is: ', creator);
	console.log('channel avatar is: ', avatar);

	try {
		const channel = new PrivateChannel({
			name,
			creator: foundCreator._id,
			messages: [],
			members: [foundCreator._id],
			avatar: avatar || '',
			expireAt: lifespan ? moment().add(lifespan, 'minutes') : undefined,
			msgLife: msgLife,
		});
		await channel.save();
		console.log('Private Channel saved!');
		res.send(channel);
	} catch (err) {
		console.log('problem creating channel', err);
		if (err.message.includes('duplicate key')) {
			res.send({ error: 'Channel Name Taken.' });
		} else {
			res.send({ error: 'Unable to Create Channel.' });
		}
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
		if (err.message.includes('duplicate key')) {
			res.send({ error: 'Channel Name Taken.' });
		} else {
			res.send({ error: 'Unable to Create Channel.' });
		}
	}
});

router.delete('/channels', async (req, res) => {
	const { username, roomName, channel_id, isPrivate } = req.query;
	console.log('channel_id', channel_id);
	console.log('req.body', req.query);
	try {
		const foundUser = await User.findOne({ username: username });
		if (!isPrivate) {
			await Channel.deleteOne({ _id: channel_id }, function (err) {
				if (err) throw 'There was a problem trying to delete channel.';
			});
		} else {
			await PrivateChannel.deleteOne({ _id: channel_id }, function (err) {
				if (err) throw 'There was a problem trying to delete channel.';
			});
		}
		const channels = await Channel.find({});
		const privateChannels = await PrivateChannel.find({
			members: foundUser._id,
		});
		res.send({ channels, privateChannels });
	} catch (err) {
		console.log(err);
		return res.status(422).send({ error: err });
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
		const foundInvitee = await User.findOne({ username: invitee });
		if (!foundInvitee) throw 'could not find invitee';
		const updatedChannel = await PrivateChannel.updateOne(
			{ name: roomName },
			{ $push: { members: foundInvitee._id } }
		);
		console.log(invitee, 'added!');
		console.log('updatedChannel', updatedChannel);
		res.send({ updatedChannel });
	} catch (err) {
		console.log(err);
		return res.status(422).send({ error: 'could not find user with that name' });
	}
});

module.exports = router;
