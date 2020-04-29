require('./src/models/User');
require('./src/models/Channel');
require('./src/models/PrivateChannel');
require('./src/models/PM');
require('./src/models/Message');
require('./src/models/Img');
let localMongoUri;
// localMongoUri = require('./keys').localMongoUri;
const express = require('express');
// const keyword omitted to make app variable global and thus accessible in routes files
app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
// sets io variable on app object so other files can access with app.get("io")
app.set('io', io);
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const messageRoutes = require('./src/routes/messageRoutes');
const authRoutes = require('./src/routes/authRoutes');
const channelRoutes = require('./src/routes/channelRoutes');

app.use(cors());
app.use(bodyParser.json());
app.use(authRoutes);
app.use(channelRoutes);
app.use(messageRoutes);
const mongoUri = process.env.mongoString || localMongoUri;

mongoose.connect(mongoUri, {
	useNewUrlParser: true,
	useCreateIndex: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
});
mongoose.connection.on('connected', () => {
	console.log('Connected to mongo instance');
});
mongoose.connection.on('error', (err) => {
	console.error('Error connecting to mongo', err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
