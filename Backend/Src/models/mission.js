const mongoose = require('mongoose');
const { Schema } = mongoose;

const missionSchema = new Schema({
   title: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
      maxLength: 100
   },
   description: {
      type: String,
      required: true,
      trim: true
   },
   points: {
      type: Number,
      required: true,
      default: 100,
      min: 0
   },
   problems: [{
      type: Schema.Types.ObjectId,
      ref: 'problem',
      required: true
   }],
   isActive: {
      type: Boolean,
      default: true
   },
   creator: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true
   }
}, {
   timestamps: true
});

const Mission = mongoose.model('mission', missionSchema);
module.exports = Mission;
