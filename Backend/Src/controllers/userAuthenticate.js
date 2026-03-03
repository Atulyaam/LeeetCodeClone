const { request } = require("express")
const User = require("../models/users")
const validate = require("../utils/validate")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const redisClient = require("../config/redis")
const ProblemSubmission  = require("../models/ProblemSubmission")
const register = async (req,res)=>{
   try {
      // first validating user given info
      validate(req.body)
      // creating it
      const {firstName,emailId,password}=req.body;
      // making user only user can register for admin register seperate path 
      req.body.role ='user'
      // ager email id exsist kerta hai ki nahi ye bhi chek kern hai usko like sakte hoo ya user.create automatically chekc ker leta hai
      // User.exists({emailId})  true false me ans aayegaa
      // hashing the password
      req.body.password = await bcrypt.hash(password,10)
      const user = await User.create(req.body)
        // after rigster user directolly directed to web page no need to relogin
      const token =  jwt.sign({_id:user._id,emailId:emailId,role:'user'},process.env.JWT_KEY,{expiresIn:60*60})
      res.cookie('token',token,{maxAge:60*60*1000})
      res.status(201).send("User Registerd Succsessfully")

      

      
   } catch (error) {
      res.status(400).send("Error: "+error)
   }

}

const login = async (req,res)=>{
   try {
      const {emailId,password} = req.body;
      if(!(emailId || password)){
         throw new Error("Invalid Credentials")
      }
      const user= await User.findOne({emailId:emailId})
      // password verification
      const check = await bcrypt.compare(password,user.password);
      if(!check){
         throw new Error("Invalid Credentials")
      }
      const token = jwt.sign({_id:user._id,emailId:user.emailId,role:user.role} ,process.env.JWT_KEY,{expiresIn:60*60})

      res.cookie('token',token,{maxAge:60*60*1000})
      res.status(200).send("Logged in Succsessfully")
      
      
   } catch (error) {
      res.status(404).send("Error: "+error)
      
   }


}

const logout = async(req,res)=>{
   try {
      // first validate the token
      // then add token in redish block list
      // cookie ko clear kker dena
      const {token} = req.cookies;
      const payload = jwt.decode(token);
      await redisClient.set(`token:${token}`,'Blocked')
      await redisClient.expireAt(`token:${token}`,payload.exp)

      res.cookie("token",null, {expires: new Date(Date.now())});
      res.send("Logged Out Succsessfully");



      
   } catch (error) {
      res.status(401).send("Error: "+error)
      
   }

} 

const getProfile =async (req,res)=>{

} 
const changePassword =async (req,res)=>{

}

const adminRegister = async (req,res)=>{
   try {
      // similar as you register user
      validate(req.body)

      const {firstName,emailId,password}=req.body;
   
      // req.body.role ='admin'
      
      req.body.password = await bcrypt.hash(password,10)
      const user = await User.create(req.body)
      
      const token =  jwt.sign({_id:user._id,emailId:emailId,role:user.role},process.env.JWT_KEY,{expiresIn:60*60})
      res.cookie('token',token,{maxAge:60*60*1000})
      res.status(201).send("User Registerd Succsessfully")
      
   } catch (error) {
      res.status(400).send("Error: "+error)
   } 

}

const deleteProfile = async (req,res)=>{
   try {
      const userId = req.result._id
      // user schema deleted
      await User.findByIdAndDelete(userId)

      // now deletinh user userSubmission
      // deleting from user Schema
      // ProblemSubmission.deleteMany({userId})

      res.status(200).send("deleted Succsessfully")
   } catch (error) {
      res.status(501).send("Error: "+error)
   }
}

module.exports={login,logout,register,getProfile,changePassword,adminRegister,deleteProfile}