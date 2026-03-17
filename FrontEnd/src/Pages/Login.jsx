import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { loginUser } from "../authSlice";

const loginSchema = z.object({
  emailId: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password should contain at least 8 characters"),
});


export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {isAuthenticated, loading, error}=useSelector((state)=>{
    return state.auth
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });
  useEffect(()=>{
    if(isAuthenticated){
      navigate('/')
    }
  },[isAuthenticated,navigate])

  const submittedData = (data) => {
    dispatch(loginUser(data))
  };
// Login code is similar to Sign up just removed name

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0d1117] relative overflow-hidden">
      {/* Decorative background blur elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="card w-full max-w-md glass-panel shadow-2xl card-hover-fx relative z-10">
        <div className="card-body p-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
            <p className="text-sm text-gray-400 mt-2">Sign in to continue to DupliCode</p>
          </div>

          <form onSubmit={handleSubmit(submittedData)} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-300 font-medium">Email Address</span>
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                className={`input input-bordered bg-base-200/50 focus:bg-base-200 border-gray-700 focus:border-primary transition-colors ${errors.emailId ? "input-error" : ""}`}
                {...register("emailId")}
              />
              {errors.emailId && <span className="text-error text-xs mt-1">{errors.emailId.message}</span>}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text text-gray-300 font-medium">Password</span>
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className={`input input-bordered bg-base-200/50 focus:bg-base-200 border-gray-700 focus:border-primary transition-colors ${errors.password ? "input-error" : ""}`}
                {...register("password")}
              />
              {errors.password && <span className="text-error text-xs mt-1">{errors.password.message}</span>}
            </div>

            <div className="form-control pt-2">
              <button
                type="submit"
                className={`btn btn-primary w-full shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02] ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </div>
            
            {error && (
              <div className="alert alert-error mt-4 text-sm shadow-sm">
                 <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <span>{error}</span>
              </div>
            )}
            
            <p className="text-center mt-6 text-sm text-gray-400">
              Don't have an account?{" "}
              <NavLink to="/signup" className="text-primary hover:text-primary-focus font-medium transition-colors hover:underline">
                Create one now
              </NavLink>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
                