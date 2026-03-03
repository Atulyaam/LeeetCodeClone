const mongoose = require('mongoose')
const {Schema} = mongoose;

const userSchema = new Schema({
  firstName:{
    type:String,
    minLength:3,
    maxLength:20,
    trim:true,
    required:true,
  },
  lastName:{
    type:String,
    minLength:3,
    maxLength:20,
    trim:true,
  
  },
  emailId:{
    type:String,
    required:true,
    unique:true,
    lowercase:true,
    immutable:true,
    trim:true,
  },
  password:{
    type:String,
    required:true,
    trim:true,
    minLength:8,

  },
  age:{
    type:Number,
    min:6,
    max:70,
  },
  role:{
    type:String,
    enum:['user','admin'],
    default:'user', 
  },
  problemSolved:{
    type:[{
      type:Schema.Types.ObjectId,
      ref:'problem'
    }],
    default:[]
  }
},{
  timestamps:true
})

// writing a function that runn everytime when a any user is deleted

userSchema.post('findOneAndDelete', async function(userInfo){
  if(userInfo){
    await mongoose.model('userSubmission').deleteMany({
      userId: userInfo._id
    })
  }
})

const User  =mongoose.model("user",userSchema);
module.exports=User