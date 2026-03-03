import { Route, Routes } from "react-router-dom"
import HomePage from "./Pages/HomePage"
import Login from "./Pages/Login"
import Signup from "./Pages/Signup"
export default function App(){
  return(
    <>
    <Routes>
      <Route path="/" element={<HomePage></HomePage>}>
      </Route>
      <Route path="/login" element={<Login></Login>}></Route>
      <Route path="/signup" element={<Signup></Signup>}></Route>
    </Routes>
    </>
  )
}