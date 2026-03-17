const express = require('express')
const app = express();
require('dotenv').config();
const main = require('./config/db')
const cookieParser = require('cookie-parser')
const authRouter = require("./routes/userAuth")
const redisClient = require("./config/redis")
const problemRouter = require("./routes/problemCreator")
const submitRouter = require("./routes/submit")
const videoRouter = require("./routes/videoCreator")
const missionRouter = require("./routes/missionRoutes");
const cors = require('cors')

// ye direct jo JSON formate me data aata hai usko java script object me convert ker degaa
app.use(cors({
  origin:'http://localhost:5173',
  credentials:true
}))

app.use(express.json())
app.use(cookieParser());

app.use('/user',authRouter)
app.use('/problem',problemRouter)
// support legacy/plural path
app.use('/problems', problemRouter)
app.use('/submission',submitRouter)
app.use('/video',videoRouter)
app.use('/mission', missionRouter);

const InitializeConnction = async ()=>{
  try {
    await Promise.all([main(),redisClient.connect()])
    console.log("DB Connected")
    app.listen(process.env.PORT, () => {
     console.log("Server running At Port Number: " + process.env.PORT);
   })
    
  } catch (error) {
    console.log("Error: "+error.message)
  }
}
InitializeConnction();

// main().then(async ()=>{
//   app.listen(process.env.PORT, () => {
//     console.log("Server running At Port Number: " + process.env.PORT);
//   });

// }).catch(
//   err=>console.log(err)
// )

