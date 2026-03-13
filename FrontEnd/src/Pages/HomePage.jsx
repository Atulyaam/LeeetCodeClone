import { useDispatch, useSelector } from "react-redux"
import { logoutUser } from "../authSlice"
import { useEffect, useState } from "react";
import axiosClient from "../utils/axiosClient";
import { NavLink } from "react-router-dom";
 
function HomePage(){
   const dispatch = useDispatch();
   const {user} = useSelector((state)=>{
       return state.auth
   });
   const [problem,setProblem] = useState([]);
   const [solvedProblem,setSolvedProblem] = useState([])
   const [isLoading,setIsLoading] = useState(true);
   const [error,setError] = useState('');
   const [filters,setFilters] =useState({
      difficulty:'all',
      tag:'all',
      status:'all'
   })
   useEffect(()=>{
      const fetchProblems = async ()=>{
         try {
            const {data} = await axiosClient.get('/problem/allProblem');
            setProblem(data)
         } catch (error) {
            setError(typeof error?.response?.data === 'string' ? error.response.data : 'Error fetching problems');
         }
      }
      const fetchSolvedProblem = async ()=>{
         try {
            const {data} = await axiosClient.get('/problem/ProblemSolvedByUser');
            setSolvedProblem(Array.isArray(data) ? data : []);
         } catch (error) {
            setSolvedProblem([]);
         }
      }

      const initialize = async () => {
         setIsLoading(true);
         await fetchProblems();
         if(user) {
            await fetchSolvedProblem();
         }
         setIsLoading(false);
      };

      initialize();
   },[user])


   const handleLogout = ()=>{
      dispatch(logoutUser());
      setSolvedProblem([]);
   };

   const solvedProblemIds = new Set(solvedProblem.map((item)=>item._id));

   const filterProblems = problem.filter(problem=>{
      const difficultyMatch = filters.difficulty==='all'||problem.difficulty===filters.difficulty;

      const tagMatch = filters.tag==='all' || problem.tags === filters.tag;
      const statusMatch = filters.status==="all" || solvedProblemIds.has(problem._id)

      return difficultyMatch && tagMatch && statusMatch
   })

   
   

   return(
      <div className="min-h-screen bg-base-200">
         {/* Nav Bar */}
         <nav className="navbar bg-base-100 shadow-lg px-4">
            <div className="flex-1">
               <NavLink to="/" className="btn btn-ghost text-xl">LeetCode</NavLink>
            </div>
            <div className="flex-none gap-4">
               <div className="dropdown dropdown-end">
                  <div tabIndex={0} className="btn btn-ghost">
                     {
                        user?.firstName
                     }
                  </div>
                  <ul className="mt-3 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
                     {user?.role === 'admin' && (
                        <li>
                           <NavLink to="/admin">Admin Panel</NavLink>
                        </li>
                     )}
                     <li>
                        <button onClick={handleLogout}>Logout</button>
                     </li>
                  </ul>

               </div>

            </div>
         </nav>
         {/* Main Contennt */}
         <div className="container mx-auto p-4">
            {error && <div className="alert alert-error mb-4">{error}</div>}
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
               {/* New Status Filter */}
               <select
               className="select select-bordered"
               value={filters.status}
               onChange={(e)=>{
                  setFilters({
                     ...filters, status: e.target.value
                  })
               }}
               >
                  <option value="all">All Problem</option>
                  <option value="solved">Solved Problem</option>
               </select>
               <select
               className="select select-bordered"
               value={filters.difficulty}
               onChange={(e)=>{
                  setFilters({
                     ...filters, difficulty:e.target.value
                  })
               }}
               >
                  <option value={"all"}>All Difficulties</option>
                  <option value={"easy"}>Easy</option>
                  <option value={"medium"}>Medium</option>
                  <option value={"hard"}>Hard</option>

               </select>
               <select
               className="select select-bordered"
                value={filters.tag}
                onChange={(e)=>{
                  setFilters({
                     ...filters, tag:e.target.value
                  })
                }}
               >
                  <option value={"all"}>All Tags</option>
                  <option value={"array"}>Array</option>
                  <option value={"linkedList"}>Linked List</option>
                  <option value={"graph"}>Graph</option>
                  <option value={"dp"}>DP</option>
               </select>
            </div>
            {/* Problem List */}
            <div className="grid gap-4">
               {isLoading && <div className="text-center py-8">Loading problems...</div>}
               {!isLoading && filterProblems.length===0 && (
                  <div className="text-center py-8 text-base-content/70">No problems found.</div>
               )}
               {
                  filterProblems.map(problem=>{
                     const isSolved = solvedProblemIds.has(problem._id);
                     return (
                        <div key={problem._id} className="card bg-base-100 shadow">
                           <div className="card-body">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                 <h2 className="card-title">{problem.title}</h2>
                                 <div className="flex gap-2 items-center">
                                    <span className={`badge ${getDifficultyBadgeColor(problem.difficulty)}`}>{problem.difficulty}</span>
                                    <span className="badge badge-outline">{problem.tags}</span>
                                    {isSolved && <span className="badge badge-success">Solved</span>}
                                 </div>
                              </div>
                              <p className="text-sm text-base-content/80 line-clamp-2">{problem.description}</p>
                              <div className="card-actions justify-end mt-2">
                                 <NavLink className="btn btn-primary btn-sm" to={`/problem/${problem._id}`}>
                                    Solve Problem
                                 </NavLink>
                              </div>
                           </div>
                        </div>
                     )
                  })
               }

            </div>
         </div>
         

      </div>
   )
}


const getDifficultyBadgeColor = (difficulty)=>{
   if(difficulty === 'easy') return 'badge-success';
   if(difficulty === 'medium') return 'badge-warning';
   if(difficulty === 'hard') return 'badge-error';
   return 'badge-ghost';

}

// Now creating Admin AdminPanel




export default HomePage