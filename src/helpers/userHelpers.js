let users = [];

const addUser = ({ id, name, room }) => {
  console.log("users array: ", users);
  const existingUser = users.find(
    // user => user.room === room && user.name === name
    user => user.id === id
  );
  const userAlreadyHere = users.find(
    user => user.room === room && user.name === name
  );
  console.log("previous user connections exist");

  if (!name || !room) return { error: "Username and room are required" };
  if (existingUser) {
    return { error: "Username is taken" };
  }

  const user = { id, name, room };
  users.push(user);
  if (userAlreadyHere) {
    users = users.filter(user => {
      return user.name !== name || (user.name === name && user.id === id);
    });
  }

  return { user };
};

const removeUser = name => {
  console.log("removing user");
  // const index = users.findIndex(user => useruser === id);
  let user = users.find(user => user.name === name);
  // if (index !== -1) {
  //   return users.splice(index, 1)[0];
  // }
  console.log(name);
  let filteredUsers = users.filter(user => user.name !== name);
  users = filteredUsers;
  console.log(users);
  return user;
};

const getUser = id => users.find(user => user.id === id);

const getUsersInRoom = room => {
  return users.filter(user => user.room === room);
};

module.exports = { addUser, removeUser, getUser, getUsersInRoom };
