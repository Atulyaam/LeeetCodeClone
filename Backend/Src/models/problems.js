const mongoose = require('mongoose')
const {Schema} = mongoose;


const problemSchema = new Schema({
   title:{
      type:String,
      require:true,
   },
   description:{
      type:String,
      require:true
   },
   difficulty:{
      type:String,
      enum:['easy','medium','hard'],
      require:true
   },
   tags:{
      type:String,
      enum:['array','linkedList','graph','dp'],
      require:true
   },
   visibalTestCases:[
      {
         input:{
            type:String,
            require:true
         },
         output:{
            type:String,
            require:true
         },
         explanation:{
            type:String,
            require:true

         }
      }
   ],
   hiddenTestCases:[
      {
         input:{
            type:String,
            require:true
         },
         output:{
            type:String,
            require:true
         } 
      }
   ],
   startCode:[
      {
         language:{
            type:String,
            require:true
         },
         intialCode:{
            type:String,
            require:true
         }
      }
   ],
   problemCreator:{
      // which admin created the problem 
      type: Schema.Types.ObjectId,
      // multiple schema have so refer user schema
      ref:'user',
      require:true
   },
   referenceSolution:[
      {
         language:{
            type:String,
            require:true
         },
         code:{
            type:String,
            require:true
         }
      }
   ],
})

const Problem = mongoose.model('problem',problemSchema)

module.exports = Problem;