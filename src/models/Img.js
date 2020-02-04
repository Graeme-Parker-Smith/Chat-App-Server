const mongoose = require('mongoose');

const imgSchema = new mongoose.Schema(
	{
		img: { data: Buffer, contentType: String },
	},
	{ timestamps: true }
);

mongoose.model('Img', imgSchema);
