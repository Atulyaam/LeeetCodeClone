import { useDispatch, useSelector } from "react-redux"
import { logoutUser } from "../authSlice"
import { useEffect, useState } from "react";
import axiosClient from "../utils/axiosClient";
import { NavLink } from "react-router-dom";

const getProblemId = (item) => {
   if (!item) return "";
   if (typeof item === "string" || typeof item === "number") return String(item);
   const rawId = item._id || item.id || item.problemId?._id || item.problemId || item.problem?._id || item.problem;
   return rawId ? String(rawId) : "";
};
 
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
         } catch (err) {
            console.error('fetchSolvedProblem failed:', err);
            setSolvedProblem([]);
         }
      }

      const initialize = async () => {
         setIsLoading(true);
         await Promise.all([fetchProblems(), fetchSolvedProblem()]);
         setIsLoading(false);
      };

      initialize();
   },[user])


   const handleLogout = ()=>{
      dispatch(logoutUser());
      setSolvedProblem([]);
   };

   const solvedProblemIds = new Set(
      solvedProblem
         .map((item)=>getProblemId(item))
         .filter(Boolean)
   );

   const filterProblems = problem.filter(problem=>{
      const difficultyMatch = filters.difficulty==='all'||problem.difficulty===filters.difficulty;

      const tagMatch = filters.tag==='all' || problem.tags === filters.tag;
      const statusMatch = filters.status==="all" || solvedProblemIds.has(getProblemId(problem))

      return difficultyMatch && tagMatch && statusMatch
   })

   return(
      <div className="min-h-screen bg-[#0d1117] text-gray-300 font-sans selection:bg-primary/30">
         {/* Modern Floating Navbar */}
         <div className="pt-4 px-4 sticky top-0 z-50">
            <nav className="glass-panel rounded-2xl shadow-xl px-6 py-3 flex items-center justify-between">
               <div className="flex-1">
                  <NavLink to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight hover:opacity-80 transition-opacity">
                     DupliCode
                  </NavLink>
               </div>
               
               <div className="flex items-center gap-6">
                  {/* Global Nav Links */}
                  <div className="hidden md:flex gap-4">
                     <NavLink to="/" className="text-sm font-medium hover:text-white transition-colors">Problems</NavLink>
                     <NavLink to="/missions" className="text-sm font-medium hover:text-white transition-colors relative">
                        Missions
                        <span className="absolute -top-1 -right-2 flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                        </span>
                     </NavLink>
                  </div>

                  <div className="dropdown dropdown-end">
                     <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar border border-gray-700 hover:border-primary transition-colors">
                        <div className="w-10 rounded-full bg-base-300 flex items-center justify-center text-white font-bold">
                           {user?.firstName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                     </div>
                     <ul tabIndex={0} className="mt-4 z-[1] p-2 shadow-2xl menu menu-sm dropdown-content bg-[#161b22] border border-gray-800 rounded-box w-52 glass-panel">
                        <li className="px-4 py-2 text-xs text-gray-400 border-b border-gray-800 mb-1">
                           Signed in as <br/><strong className="text-white">{user?.firstName}</strong>
                        </li>
                        {user?.role === 'admin' && (
                           <li><NavLink to="/admin" className="hover:bg-primary/20 hover:text-primary transition-colors">Admin Panel</NavLink></li>
                        )}
                        <li><NavLink to="/profile" className="hover:bg-primary/20 hover:text-primary transition-colors">Profile</NavLink></li>
                        <div className="divider my-0 border-gray-800"></div>
                        <li><button onClick={handleLogout} className="text-error hover:bg-error/20 transition-colors">Logout</button></li>
                     </ul>
                  </div>
               </div>
            </nav>
         </div>

         {/* Main Dashboard Content */}
         <div className="container mx-auto px-4 py-8 max-w-7xl">
            {error && (
               <div className="alert alert-error shadow-lg mb-6 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
               </div>
            )}

            {/* Dashboard Headers & Stats */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6">
               <div>
                  <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Problem Set</h1>
                  <p className="text-gray-400">Master algorithms and data structures.</p>
               </div>
               
               {/* Quick Stats */}
               <div className="flex gap-4">
                  <div className="glass-panel px-6 py-3 rounded-xl text-center shadow-lg">
                     <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Solved</p>
                     <p className="text-2xl font-bold text-success">{solvedProblemIds.size} <span className="text-sm text-gray-500">/ {problem.length}</span></p>
                  </div>
                  <div className="glass-panel px-6 py-3 rounded-xl text-center shadow-lg">
                     <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Points</p>
                     <p className="text-2xl font-bold text-secondary">{user?.totalPoints || 0}</p>
                  </div>
               </div>
            </div>

            {/* Filters Bar */}
            <div className="glass-panel rounded-xl p-4 mb-8 flex flex-wrap gap-4 items-center shadow-md">
               <div className="flex items-center gap-2 mr-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                  <span className="text-sm font-medium text-gray-300">Filters</span>
               </div>
               
               <select
                  className="select select-sm select-bordered bg-[#0d1117] border-gray-700 hover:border-gray-500 focus:border-primary w-full md:w-auto"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
               >
                  <option value="all">All Status</option>
                  <option value="solved">Solved</option>
                  <option value="unsolved">Unsolved</option>
               </select>

               <select
                  className="select select-sm select-bordered bg-[#0d1117] border-gray-700 hover:border-gray-500 focus:border-primary w-full md:w-auto"
                  value={filters.difficulty}
                  onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
               >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
               </select>

               <select
                  className="select select-sm select-bordered bg-[#0d1117] border-gray-700 hover:border-gray-500 focus:border-primary w-full md:w-auto"
                  value={filters.tag}
                  onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
               >
                  <option value="all">All Topics</option>
                  <option value="array">Array</option>
                  <option value="linkedList">Linked List</option>
                  <option value="graph">Graph</option>
                  <option value="dp">Dynamic Programming</option>
               </select>
            </div>

            {/* Problem List as sleek table-like cards */}
            <div className="space-y-3">
               {isLoading && (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                     <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                     <p>Loading problems...</p>
                  </div>
               )}
               
               {!isLoading && filterProblems.length === 0 && (
                  <div className="glass-panel text-center py-16 rounded-2xl flex flex-col items-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                     <h3 className="text-xl font-bold text-white mb-2">No problems found</h3>
                     <p className="text-gray-400">Try adjusting your filters or check back later.</p>
                  </div>
               )}
               
               {!isLoading && filterProblems.map((problem, index) => {
                  const isSolved = solvedProblemIds.has(getProblemId(problem));
                  return (
                     <div key={problem._id} className="group glass-panel rounded-xl p-4 md:px-6 flex flex-col md:flex-row items-start md:items-center gap-4 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-primary/10">
                        {/* Status Icon */}
                        <div className="hidden md:flex flex-shrink-0 w-8 items-center justify-center">
                           {isSolved ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                           ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-600 group-hover:bg-primary/50 transition-colors"></div>
                           )}
                        </div>

                        {/* Title & Description */}
                        <div className="flex-1 min-w-0">
                           <h2 className="text-lg font-semibold text-white truncate group-hover:text-primary transition-colors">
                              {index + 1}. {problem.title}
                           </h2>
                           <p className="text-sm text-gray-500 truncate mt-1">{problem.description}</p>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                           <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getDifficultyBadgeColor(problem.difficulty)}`}>
                              {problem.difficulty}
                           </span>
                           <span className="px-3 py-1 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {problem.tags}
                           </span>
                           
                           {/* Action button */}
                           <NavLink 
                              to={`/problem/${problem._id}`} 
                              className="btn btn-sm btn-primary ml-auto md:ml-4 rounded-lg px-6 opacity-90 group-hover:opacity-100 shadow-md transition-all hover:scale-105"
                           >
                              {isSolved ? "Review Code" : "Solve"}
                           </NavLink>
                        </div>
                     </div>
                  )
               })}
            </div>
         </div>
      </div>
   )
}

const getDifficultyBadgeColor = (difficulty)=>{
   if(difficulty === 'easy') return 'bg-success/10 text-success border-success/20';
   if(difficulty === 'medium') return 'bg-warning/10 text-warning border-warning/20';
   if(difficulty === 'hard') return 'bg-error/10 text-error border-error/20';
   return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

// Now creating Admin AdminPanel




export default HomePage