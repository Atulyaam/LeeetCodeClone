const mongoose = require('mongoose');

const { Schema } = mongoose;

const solutionVideoSchema = new Schema(
	{
		problemId: {
			type: Schema.Types.ObjectId,
			ref: 'problem',
			required: true,
			unique: true,
		},
		uploaderId: {
			type: Schema.Types.ObjectId,
			ref: 'user',
			required: true,
		},
		cloudinaryPublicId: {
			type: String,
			required: true,
		},
		secureUrl: {
			type: String,
			required: true,
		},
		duration: {
			type: Number,
			default: 0,
		},
		thumbnailUrl: {
			type: String,
			default: '',
		},
	},
	{ timestamps: true }
);

const SolutionVideo = mongoose.model('solutionVideo', solutionVideoSchema);

module.exports = SolutionVideo;
