import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { registerUser } from "../authSlice";
import { useEffect, useState } from "react";

const signupSchema = z.object({
  firstName: z.string().min(3, "Name should contain at least 3 characters"),
  emailId: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password should contain at least 8 characters"),
});

export default function Signup() {
  const [showPassword,setShowPassword] = useState(false)
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    isAuthenticated,loading, error
  } = useSelector((state)=>{
    return state.auth;
  })
  const {
    register,
    handleSubmit,

    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });

  useEffect(()=>{
    if(isAuthenticated){
      navigate('/')
    }
  },[isAuthenticated,navigate])

  const submittedData = (data) => {
    dispatch(registerUser(data));
  };
// this is the code for Signup 
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-90 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-3xl">Leetcode</h2>

          <form onSubmit={handleSubmit(submittedData)}>
            <div className="form-control">
              <label className="label mb-1">
                <span className="label-text">First Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter your name"
                className={`input input-bordered ${errors.firstName ? "input-error" : ""}`}
                {...register("firstName")}
              />
              {errors.firstName && <span className="text-error">{errors.firstName.message}</span>}
            </div>

            <div className="form-control mt-4">
              <label className="label mb-1">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                className={`input input-bordered ${errors.emailId ? "input-error" : ""}`}
                {...register("emailId")}
              />
              {errors.emailId && <span className="text-error">{errors.emailId.message}</span>}
            </div>

            <div className="form-control mt-4">
              <label className="label mb-1">
                <span className="label-text">Password</span>
              </label>
              <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={`input input-bordered ${errors.password ? "input-error" : ""}`}
                {...register("password")}
              />
              <button
                type="button"
                className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                onClick={()=>setShowPassword((prev)=>!prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
              </div>
              
              {errors.password && <span className="text-error">{errors.password.message}</span>}
            </div>

            <div className="form-control mt-4">
              <button type="submit"
              className={
                `btn btn-primary w-full ${loading?'loading':''}`
              }
              disabled={loading}
               >
                {loading ? 'Creating account' : 'Submit'}
              </button>
            </div>
            {error && (
              <div className="alert alert-error mt-4 text-sm">{error}</div>
            )}
            <p className="text-center mt-4 text-sm">
              Already have an account?{" "}
              <NavLink to="/login" className="link link-primary">Login</NavLink>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
                