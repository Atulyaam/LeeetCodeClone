import { Navigate, Route, Routes } from "react-router-dom"
import HomePage from "./Pages/HomePage"
import Login from "./Pages/Login"
import Signup from "./Pages/Signup"
import { useDispatch, useSelector } from "react-redux"
import { useEffect } from "react"
import { checkAuth } from "./authSlice"
import AdminPanel from "./Pages/AdminPanel"
import ProblemPage from "./Pages/ProblemPage"
import MissionsPage from "./Pages/MissionsPage"
export default function App(){
  // isAuthenticated ka code
  const dispatch = useDispatch();
  const {isAuthenticated,user,loading} = useSelector((state)=>{
    return state.auth
  })


  useEffect(()=>{
    dispatch(checkAuth());
  },[dispatch])

  if(loading){
    return <div className="min-h-screen flex items-center justify-center">
      <span className="loading loading-spinner loading-lg"></span>
    </div>

  }
  return(
    <>
    <Routes>
      <Route path="/" element={isAuthenticated ?<HomePage></HomePage>:<Navigate to="/login"></Navigate>}>
      </Route>

      <Route path="/missions" element={isAuthenticated ?<MissionsPage></MissionsPage>:<Navigate to="/login"></Navigate>}>
      </Route>


      <Route path="/login" element={isAuthenticated?<Navigate to="/"></Navigate>:<Login></Login>}></Route>


      <Route path="/signup" element={isAuthenticated ? <Navigate to="/"></Navigate>:<Signup></Signup>}></Route>


      <Route
      path="/admin"
      element={
        isAuthenticated
          ? (user?.role === "admin"
              ? <AdminPanel/>
              : <Navigate to="/"></Navigate>)
          : <Navigate to="/login"></Navigate>
      }
      >
      </Route>


      <Route path="/problem/:problemId" element={
        isAuthenticated ? <ProblemPage></ProblemPage> : <Navigate to="/login"></Navigate>
      }>
        

      </Route>
      <Route path="*" element={<Navigate to="/"></Navigate>}></Route>
    </Routes>
    </>
  )
}