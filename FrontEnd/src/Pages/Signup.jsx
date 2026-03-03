import { useState } from "react";
import { useForm } from "react-hook-form"

export default function Signup(){
   const {register,handleSubmit,formState: {errors},} = useForm();

   const submittedData = (data)=>{
      console.log(data);

   }

   return (
      <>
      <form onSubmit={handleSubmit(submittedData)}>
         <input {...register('firstName')} placeholder="Enter Your name" type="text"></input>
         <input {...register('emailId')} placeholder="Enter email" type="text"></input>
         <input {...register('password')} placeholder="Enter password" type="password"></input>
         <button type="submit" className="btn"  >Submit</button>
      </form>
      </>
   )
  
}



// Prrevious way 



//  const[name,setName] = useState('')
//    const [email,setEmail] = useState('')
//    const [password,setPassword] = useState('')
//    const handleSubmit = (e)=>{
//       e.preventDefault();
//    }
//    return (
//       <form onSubmit={handleSubmit}>
         
//       </form>
//    )