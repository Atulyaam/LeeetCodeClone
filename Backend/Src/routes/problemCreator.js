// requird routes
const express = require('express');
const problemRouter = express.Router();
const adminMiddleware = require("../middleware/adminMiddleware")
const userMiddleware = require("../middleware/userMiddleware")
const {createProblem, fetchProblembyId, fetchAllProblem, updateProblem, deleteProblembyId, solvedProblembyUser,submittedProblem} = require('../controllers/userProblem');



// problem creation
problemRouter.post("/create",adminMiddleware,createProblem)
// problem fetch
problemRouter.get("/problemById/:id",userMiddleware,fetchProblembyId)
problemRouter.get("/allProblem",userMiddleware,fetchAllProblem)


// above all wants admin middleware
// problem update
problemRouter.put("/update/:id",adminMiddleware,updateProblem)
// problem delete
problemRouter.delete("/delete/:id",adminMiddleware,deleteProblembyId)

problemRouter.get("/ProblemSolvedByUser",userMiddleware,solvedProblembyUser)
// all code submission by user for perticuler problem
// pid====problem id
problemRouter.get("/submittedProblem/:pid",userMiddleware,submittedProblem)



module.exports = problemRouter;
