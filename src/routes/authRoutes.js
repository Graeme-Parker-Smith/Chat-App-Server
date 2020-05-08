const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const Channel = mongoose.model('Channel');
const Message = mongoose.model('Message');
const Img = mongoose.model('Img');
let localSCRT;
localSCRT = require('../../keys').localSCRT;
const SCRT = process.env.JWT_SECRET || localSCRT;
const axios = require('axios');
const fetch = require('node-fetch');
// const cloudinary = require('../../cloudinary');
const cloudinary = require('cloudinary');

const router = express.Router();

router.post('/video', upload.single('videoFile'), async (req, res) => {
	try {
		console.log('req.file: ', req.file);
		cloudinary.uploader.upload(req.file.path, { resource_type: 'video' }, function (error, result) {
			console.log(result, error);
			return res.send({ secure_url: result.secure_url });
		});
		// let apiUrl = `https://api.cloudinary.com/v1_1/jaded/video/upload`;

		// console.log('apiUrl', apiUrl);
		// let fileData = fs.readFileSync(req.file.path, { encoding: 'base64' });
		// console.log('fileData', fileData.slice(0, 100));
		// let b = {
		// 	file: fileData,
		// 	upload_preset: 'auymih3b',
		// };

		// let r = await fetch(apiUrl, {
		// 	body: JSON.stringify(b),
		// 	headers: {
		// 		'content-type': 'application/json',
		// 	},
		// 	method: 'POST',
		// });
		// console.log('r', r);
		// let data = await r.json();
		// console.log('cloud_url', data);
		// res.send(data.secure_url);
	} catch (err) {
		console.log(err);
	}
});

router.post('/signup', async (req, res) => {
	// res.send("You made a post request on heroku!")
	// if (req.file) {
	// 	console.log('req.file: ', req.file);
	// 	const new_img = new Img({ img: { data: fs.readFileSync(req.file.path), contentType: 'image/jpeg' } });
	// 	var saved_img = await new_img.save();
	// 	// console.log('saved img: ', saved_img);
	// }
	const { username, password, avatar } = req.body;
	// const user = new User({ username, password });
	// await user.save();
	try {
		const user = new User({ username, password, avatar: avatar, createdAt: new Date().toLocaleDateString() });
		await user.save();
		console.log('User Created!: ', username);

		const token = jwt.sign({ userId: user._id }, SCRT);
		res.send({ token });
	} catch (err) {
		// return res.send(err);
		return res.status(422).send(err.message);
	}
});

router.post('/signin', async (req, res) => {
	const { username, password } = req.body;
	console.log('signin', username + ' ' + password);
	if (!username || !password) {
		return res.status(422).send({ error: 'Must provide username and password' });
	}

	const user = await User.findOne({ username });
	if (!user) {
		return res.status(422).send({ error: 'Invalid password or username' });
	}

	try {
		await user.comparePassword(password);
		const token = jwt.sign({ userId: user._id }, SCRT);
		res.send({ token, userData: user });
	} catch (err) {
		return res.status(422).send({ error: 'Invalid password or username' });
	}
});

router.post('/pushtoken', async (req, res) => {
	try {
		const { token, user } = req.body;
		if (!user) throw 'no userData received';
		const foundUser = await User.findOne({ _id: user._id });
		if (!foundUser) {
			console.log('could not find user');
			return res.send({ userData: foundUser });
		}
		if (foundUser.tokens.includes(token)) {
			console.log('user already has token');
			return res.send({ userData: foundUser });
		}
		const updatedUser = await User.findOneAndUpdate(
			{ _id: user._id },
			{ $push: { tokens: token } },
			{ returnNewDocument: true }
		);
		res.send({ userData: updatedUser });
	} catch (err) {
		console.log('err is: ', err);
		res.send(err);
	}
});

router.post('/signout', async (req, res) => {
	try {
		const { user_id, pushToken } = req.body;
		if (!user_id || !pushToken) throw 'could not remove pushToken from user';
		const updatedUser = await User.findOneAndUpdate({ _id: user_id }, { $pull: { tokens: pushToken } });
		res.send({ userData: updatedUser });
	} catch (err) {
		console.log(err);
		res.send(err);
	}
});

router.post('/updateuser', async (req, res) => {
	const { username, newUsername, newPassword, newAvatar } = req.body;
	if (!newPassword) {
		console.log('newpassword is falsy');
	}
	try {
		const foundUser = await User.findOne({ username });
		let updatedUser;
		if (!newPassword) {
			updatedUser = await User.findOneAndUpdate(
				{ username },
				{
					username: newUsername || foundUser.username,
					avatar: newAvatar || foundUser.avatar,
				},
				{ new: true }
			);
		} else {
			updatedUser = await User.findOneAndUpdate(
				{ username },
				{
					username: newUsername || foundUser.username,
					password: newPassword,
					avatar: newAvatar || foundUser.avatar,
				},
				{ new: true }
			);
		}
		// update user data om friends, pending, requestsReceived, and blocked fields of all other users
		const updatedUserPartial = {
			_id: updatedUser._id,
			username: updatedUser.username,
			avatar: updatedUser.avatar,
		};
		await User.updateMany(
			{
				$or: [
					{ 'friends._id': foundUser._id },
					{ 'pending._id': foundUser._id },
					{ 'requestsReceived._id': foundUser._id },
					{ 'blocked._id': foundUser._id },
				],
			},
			{
				$set: {
					'friends.$[t]': updatedUserPartial,
					'pending.$[t]': updatedUserPartial,
					'requestsReceived.$[t]': updatedUserPartial,
					'blocked.$[t]': updatedUserPartial,
				},
			},
			{ arrayFilters: [{ 't._id': foundUser._id }] }
		);
		// let channels = await Channel.find({});

		await Message.updateMany(
			{ creator: foundUser.username },
			{ $set: { creator: newUsername || foundUser.username, avatar: newAvatar || foundUser.avatar } }
		);
		// need to update private channel msgs and pms too!!

		// because msgs are no longer nested within channels, update previous msgs code no longer works here!
		// await channels.forEach(async function (doc) {
		// 	let newMessages = doc.messages.map((message) => {
		// 		if (message.creator === foundUser.username) {
		// 			message.creator = newUsername;
		// 			message.avatar = newAvatar;
		// 		}
		// 		return message;
		// 	});

		// 	await Channel.update({ name: doc.name }, { $set: { messages: newMessages } });
		// });
		res.send({ userData: updatedUser });
	} catch (err) {
		console.log(err);
		if (err.message.includes('duplicate key')) {
			res.send({ error: 'Username Taken.' });
		} else {
			res.send({ error: 'Unable to update User.' });
		}
	}
});

router.delete('/user', async (req, res) => {
	const { user_id } = req.query;
	try {
		await User.deleteOne({ _id: user_id }, function (err) {
			if (err) throw 'Could not delete user';
		});
		res.send({ success: 'successfully deleted user' });
	} catch (err) {
		console.log(err);
		return res.status(422).send({ error: err });
	}
});

module.exports = router;
