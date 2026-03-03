// using validator librarry
const validator = require("validator")

const validate = (data)=>{
   const mandatoryFeilds = ["firstName","emailId","password"]
   // yaha hum check ker rahe hai ki mandatoryFeilds ki info user data me present hai ki nai using every
   const isAllowed = mandatoryFeilds.every((info)=>Object.keys(data).includes(info));
   if(!isAllowed){
      throw new Error("Some Field Missing")
   }
   if(!validator.isEmail(data.emailId)){
      throw new Error ("Invalid Email")
   }
   if(!validator.isStrongPassword(data.password)){
      throw new Error ("Weak password Try new password")
   }
}
module.exports = validate