import { Navigate, Route, Routes } from "react-router-dom"
import HomePage from "./Pages/HomePage"
import Login from "./Pages/Login"
import Signup from "./Pages/Signup"
import { useDispatch, useSelector } from "react-redux"
import { useEffect } from "react"
import { checkAuth } from "./authSlice"
export default function App(){
  // isAuthenticated ka code
  const dispatch = useDispatch();
  const {isAuthenticated} = useSelector((state)=>{
    return state.auth
  })


  useEffect(()=>{
    dispatch(checkAuth());
  },[dispatch])
  return(
    <>
    <Routes>
      <Route path="/" element={isAuthenticated ?<HomePage></HomePage>:<Navigate to="/signup"></Navigate>}>
      </Route>
      <Route path="/login" element={isAuthenticated?<Navigate to="/"></Navigate>:<Login></Login>}></Route>
      <Route path="/signup" element={isAuthenticated ? <Navigate to="/"></Navigate>:<Signup></Signup>}></Route>
    </Routes>
    </>
  )
}