const express = require('express')
const authRouter = express.Router();
const userMiddleware  = require("../middleware/userMiddleware")
const adminMiddleware = require('../middleware/adminMiddleware')
const {login,logout,register,getProfile,changePassword,adminRegister,deleteProfile }
= require("../controllers/userAuthenticate")

// Register
authRouter.post("/register",register)

// Login
authRouter.post("/login",login)
// Logout
authRouter.post("/logout",userMiddleware,logout)
// getProfile
authRouter.post("/profile",getProfile)

// change password
authRouter.post("/change-password",changePassword)

authRouter.post("/admin/register",adminMiddleware,adminRegister);

// deleting the user
authRouter.delete("/deleteProfile",userMiddleware,deleteProfile)


// this automatically get login user if he/she visit page and already login previsiouly
// it is store forr registerd user

authRouter.get('/check',userMiddleware,(req,res)=>{
   const reply = {
      firstName: req.result.firstName,
      emailId: req.result.emailId,
      _id: req.result._id
   }
   res.status(200).json({
      user:reply,
      message:"Valid user"
   })
})

module.exports=authRouter;

// ye jo functions hai ider isno hum controllers me banayege functions
