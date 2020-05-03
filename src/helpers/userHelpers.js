let users = [];
let roomCounts = {};

const addUser = ({ id, name, room }) => {
	console.log('users array: ', users);
	const existingUser = users.find(
		// user => user.room === room && user.name === name
		(user) => user.id === id
	);
	const userAlreadyHere = users.find((user) => user.room === room && user.name === name);

	if (!name || !room) return { error: 'Username and room are required' };
	const user = { id, name, room };
	if (existingUser) {
		// return { error: 'Username is taken' };
		let updatedUsers = users.map((user) => {
			if (user.id === id) {
				return { id, name, room };
			} else {
				return user;
			}
		});
		users = updatedUsers;
	} else {
		users.push(user);
	}
	if (userAlreadyHere) {
		users = users.filter((user) => {
			return user.name !== name || (user.name === name && user.id === id);
		});
	}

	return { user };
};

const removeUser = (name) => {
	console.log('removing user');
	// const index = users.findIndex(user => useruser === id);
	let user = users.find((user) => user.name === name);
	// if (index !== -1) {
	//   return users.splice(index, 1)[0];
	// }
	console.log(name);
	let filteredUsers = users.filter((user) => user.name !== name);
	users = filteredUsers;
	console.log(users);
	return user;
};

const getUser = (name) => users.find((user) => user.name === name);

const getUsersInRoom = (room) => {
	return users.filter((user) => user.room === room);
};

const countUsers = () => {
	console.log('roomCounts', roomCounts);
	roomCounts = {};
	console.log('roomCounts', roomCounts);
	users.forEach((user) => {
		console.log('users', users);
		console.log('user', user);
		if (roomCounts[user.room]) {
			roomCounts[user.room] += 1;
		} else {
			roomCounts[user.room] = 1;
		}
	});
	console.log('roomCounts', roomCounts);
	return roomCounts;
};

module.exports = { addUser, removeUser, getUser, getUsersInRoom, countUsers };
