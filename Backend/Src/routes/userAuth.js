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

module.exports=authRouter;

// ye jo functions hai ider isno hum controllers me banayege functions
