import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axiosClient from "../utils/axiosClient";
import { NavLink } from "react-router-dom";

export default function MissionsPage() {
   const { user } = useSelector((state) => state.auth);
   const [missions, setMissions] = useState([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState("");
   const [claimingId, setClaimingId] = useState(null);

   useEffect(() => {
      fetchMissions();
   }, []);

   const fetchMissions = async () => {
      try {
         setIsLoading(true);
         const { data } = await axiosClient.get("/mission/all");
         setMissions(data);
      } catch (err) {
         setError("Failed to load missions.");
         console.error(err);
      } finally {
         setIsLoading(false);
      }
   };

   const handleClaimReward = async (missionId) => {
      try {
         setClaimingId(missionId);
         const { data } = await axiosClient.post(`/mission/claim/${missionId}`);
         // Optimistically update user state if needed or show success alert
         alert(data.message);
         // Refresh list to show as claimed
         fetchMissions();
      } catch (err) {
         alert(err?.response?.data || "Failed to claim reward.");
      } finally {
         setClaimingId(null);
      }
   };

   return (
      <div className="min-h-screen bg-[#0d1117] text-gray-300 font-sans">
         {/* Modern Navbar specific to Missions Page or we could just use a Back button for simplicity, let's include basic nav */}
         <div className="pt-4 px-4 sticky top-0 z-50">
            <nav className="glass-panel rounded-2xl shadow-xl px-6 py-3 flex items-center justify-between">
               <div className="flex-1">
                  <NavLink to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight hover:opacity-80 transition-opacity">
                     DupliCode
                  </NavLink>
               </div>
               <div className="flex gap-4">
                     <NavLink to="/" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Problems</NavLink>
                     <NavLink to="/missions" className="text-sm font-medium text-primary transition-colors">Missions</NavLink>
               </div>
            </nav>
         </div>

         <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="text-center mb-12">
               <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                  Missions & <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-primary">Achievements</span>
               </h1>
               <p className="text-gray-400 max-w-2xl mx-auto">
                  Complete curated sets of problems to earn points and master specific algorithms. 
                  Your current points: <strong className="text-secondary text-lg">{user?.totalPoints || 0}</strong>
               </p>
            </div>

            {error && <div className="alert alert-error mb-6 rounded-xl">{error}</div>}

            <div className="grid gap-6">
               {isLoading ? (
                  <div className="flex justify-center py-20"><span className="loading loading-spinner text-secondary loading-lg"></span></div>
               ) : missions.length === 0 ? (
                  <div className="text-center py-20 glass-panel rounded-2xl">
                     <h3 className="text-xl text-white font-bold">No active missions</h3>
                     <p className="text-gray-500 mt-2">Check back later for new challenges!</p>
                  </div>
               ) : (
                  missions.map(mission => {
                     const isClaimed = user?.completedMissions?.includes(mission._id);
                     const solvedCount = mission.problems.filter(p => user?.problemSolved?.some(solved => typeof solved === 'object' ? solved._id === p._id : solved === p._id)).length;
                     const totalProblems = mission.problems.length;
                     const isReadyToClaim = solvedCount === totalProblems && !isClaimed;
                     const progressPercent = Math.round((solvedCount / totalProblems) * 100) || 0;

                     return (
                        <div key={mission._id} className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-secondary/50 transition-colors">
                           {isClaimed && (
                              <div className="absolute top-0 right-0 bg-success text-success-content px-4 py-1 rounded-bl-xl font-bold text-xs uppercase tracking-wider">
                                 Completed
                              </div>
                           )}

                           <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                              <div className="flex-1">
                                 <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-white">{mission.title}</h2>
                                    <span className="badge bg-secondary/20 text-secondary border-secondary/30 font-bold">+{mission.points} Pts</span>
                                 </div>
                                 <p className="text-gray-400 mb-4">{mission.description}</p>
                                 
                                 {/* Progress Bar */}
                                 <div className="w-full bg-base-300 rounded-full h-2.5 mb-2">
                                    <div 
                                       className={`h-2.5 rounded-full ${isClaimed ? 'bg-success' : 'bg-primary'}`} 
                                       style={{ width: `${progressPercent}%` }}>
                                    </div>
                                 </div>
                                 <p className="text-xs text-gray-500 font-medium">
                                    Progress: {solvedCount} / {totalProblems} problems solved
                                 </p>
                              </div>

                              <div className="md:w-64 w-full glass-panel bg-base-300/30 p-4 rounded-xl">
                                 <h4 className="text-xs uppercase text-gray-500 font-bold mb-3 tracking-wider">Required Problems</h4>
                                 <ul className="space-y-2 mb-4">
                                    {mission.problems.map(p => {
                                       const pSolved = user?.problemSolved?.some(solved => typeof solved === 'object' ? solved._id === p._id : solved === p._id);
                                       return (
                                          <li key={p._id} className="flex items-center gap-2 text-sm">
                                             {pSolved ? (
                                                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                             ) : (
                                                <div className="w-4 h-4 rounded-full border border-gray-600"></div>
                                             )}
                                             <NavLink to={`/problem/${p._id}`} className="text-gray-300 hover:text-white truncate hover:underline">
                                                {p.title}
                                             </NavLink>
                                          </li>
                                       );
                                    })}
                                 </ul>

                                 {/* Claim Button */}
                                 <button 
                                    onClick={() => handleClaimReward(mission._id)}
                                    disabled={!isReadyToClaim || claimingId === mission._id}
                                    className={`btn w-full shadow-lg ${isClaimed ? 'btn-disabled bg-success/20 text-success' : isReadyToClaim ? 'btn-secondary animate-pulse' : 'btn-disabled'}`}
                                 >
                                    {claimingId === mission._id ? 'Claiming...' : isClaimed ? 'Reward Claimed' : 'Claim Reward'}
                                 </button>
                              </div>
                           </div>
                        </div>
                     );
                  })
               )}
            </div>
         </div>
      </div>
   );
}
