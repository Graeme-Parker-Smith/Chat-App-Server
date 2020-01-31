const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = mongoose.model('User');
const Channel = mongoose.model('Channel');
let localSCRT;
localSCRT = require('../../keys').localSCRT;
const SCRT = process.env.JWT_SECRET || localSCRT;

const router = express.Router();

router.post('/signup', async (req, res) => {
	// res.send("You made a post request on heroku!")
	// console.log(req.body);
	const { username, password, avatar } = req.body;
	// const user = new User({ username, password });
	// await user.save();
	try {
		const user = new User({ username, password, avatar });
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
    console.log("err is: ", err);
    res.send(err)
	}
});

router.post('/updateuser', async (req, res) => {
	const { username, newUsername, newPassword, newAvatar } = req.body;
	console.log('newPassword is: ', newPassword);
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
				},
				{ returnNewDocument: true }
			);
			await User.update(
				{ username },
				{
					avatar: newAvatar || foundUser.avatar,
				}
			);
		} else {
			updatedUser = await User.findOneAndUpdate(
				{ username },
				{
					username: newUsername || foundUser.username,
					password: newPassword,
					avatar: newAvatar || foundUser.avatar,
				},
				{ returnNewDocument: true }
			);
		}
		// await foundUser.save();

		let channels = await Channel.find({});
		await channels.forEach(async function(doc) {
			console.log('CHANNEL NAME', doc.name);
			let newMessages = doc.messages.map(message => {
				if (message.creator === foundUser.username) {
					console.log('old message', message);
					message.creator = newUsername;
					message.avatar = newAvatar;
					console.log('new message', message);
				}
				return message;
			});
			console.log('DOC.name', doc.name);

			await Channel.update({ name: doc.name }, { $set: { messages: newMessages } });
		});
		res.send({ userData: updatedUser });
	} catch (err) {
		console.log(err);
		return res.status(422).send({ error: 'could not find user' });
	}
});

module.exports = router;
