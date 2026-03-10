import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const signupSchema = z.object({
  emailId: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password should contain at least 8 characters"),
});


export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });

  const submittedData = (data) => {
    console.log(data);
  };
// Login code is similar to Sign up just removed name

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-90 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-3xl">Leetcode Login</h2>

          <form onSubmit={handleSubmit(submittedData)}>
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
              <input
                type="password"
                placeholder="Enter your password"
                className={`input input-bordered ${errors.password ? "input-error" : ""}`}
                {...register("password")}
              />
              {errors.password && <span className="text-error">{errors.password.message}</span>}
            </div>

            <div className="form-control mt-4">
              <button type="submit" className="btn btn-primary w-full">
                Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
                