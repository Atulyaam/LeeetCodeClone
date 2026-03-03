const mongoose = require('mongoose');
const Problem = require('./problems');
const userMiddleware = require('../middleware/userMiddleware');
const Schema = mongoose.Schema;

const ProblemSubmissionSchema = new Schema({
   userId:{
      type:Schema.Types.ObjectId,
      ref:'user',
      require:true,
   },
   problemId:{
      type:Schema.Types.ObjectId,
      ref:'Problem',
      require:true
   },
   code:{
      type:String,
      require:true
   },
   language:{
      type:String,
      require:true,
      enum:['JavaScript','Java','cpp']
   },
   status:{
      type:String,
      enum:['pending','accepted','wrong','error'],
      default:'pending'
   },
   runtime:{
      type:Number,
      default:0
   },
   memory:{
      type:Number,
      default:0
   },
   errorMessage:{
      type:String,
      default:''
   },
   testCasesPassed:{
      type:Number,
      default:0
   },
   testCasesTotal:{
      type:Number,
      default:0
   }
   
},{
   timestamps:true
})

// doing indexing in combination of userid and problem id
ProblemSubmissionSchema.index({
   userId:1,problemId:1
})

const ProblemSubmission =mongoose.model('ProblemSubmission',ProblemSubmissionSchema);

module.exports = ProblemSubmission;
 