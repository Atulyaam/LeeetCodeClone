const Problem = require("../models/problems");
const Submission = require("../models/ProblemSubmission");
const { getLanguageById, submitBatch, submitToken } = require("../utils/problemUtalitiy");
const User = require('../models/users');

const submitCode = async (req , res)=>{
   // 
    try {
         const userId = (req.user && req.user._id) || (req.result && req.result._id);
      const problemId = req.params.id;
      const {code,language} = req.body;
      if(!userId||!code||!problemId||!language){
         return res.status(400).send("Some Field is Missing")
      }
      // Feching the problem by id
     const problem = await Problem.findById(problemId);
       if(!problem){
          return res.status(404).send("Problem not found")
       }
      // normalize language for storage and judge API
      const langLower = String(language).toLowerCase();
      let judgeLangKey = langLower; // value expected by getLanguageById
      if (langLower === 'cpp') judgeLangKey = 'c++';
      if (langLower === 'js') judgeLangKey = 'javascript';

      const languageId = getLanguageById(judgeLangKey);
      if (!languageId) return res.status(400).send('Unsupported language');

      // map judge key to model enum value
      let storedLanguage = judgeLangKey === 'c++' ? 'cpp' : (judgeLangKey === 'javascript' ? 'JavaScript' : (judgeLangKey === 'java' ? 'Java' : language));

       const submitedResult = await Submission.create({
         userId,
         problemId,
         code,
         language: storedLanguage,
         testCasesPassed:0,
         status:'pending',
         testCasesTotal: Array.isArray(problem.hiddenTestCases) ? problem.hiddenTestCases.length : 0
       })
       const submission = (Array.isArray(problem.hiddenTestCases) ? problem.hiddenTestCases : []).map((testCases)=>({
      source_code:code,
      language_id: languageId,
      stdin: testCases.input,
      expected_output: testCases.output
     }))

     const submitResult = await submitBatch(submission)
      const resultToken  = Array.isArray(submitResult) ? submitResult.map((value)=>value.token) : [];

       const testResult = await submitToken(resultToken)

   //   now update the submission result 
   let testCasesPassed = 0;
   let runtime=0
   let memory = 0
   let status = 'accepted'
   let errorMessage = ''
      for(const test of testResult){
         if(test.status_id==3){
            testCasesPassed++;
            runtime = runtime+parseFloat(test.time)
            memory = Math.max(memory,test.memory) 

         }else{
            if(test.status_id==4){
               status='error'
               errorMessage = test.stderr || test.message || ''
            }
            else{
               status='wrong'
            }
         }
      }

      // Storre the result in data base
      submitedResult.status = status
      submitedResult.testCasesPassed = testCasesPassed
      submitedResult.errorMessage = errorMessage
      submitedResult.runtime = runtime
      submitedResult.memory = memory

      await submitedResult.save();

         // add problemId to user's problemSolved array (safe handling)
         try{
            const userDoc = await User.findById(userId);
            if(userDoc){
               const alreadySolved = Array.isArray(userDoc.problemSolved) && userDoc.problemSolved.some(id=> String(id) === String(problemId));
               if(!alreadySolved){
                  userDoc.problemSolved = userDoc.problemSolved || [];
                  userDoc.problemSolved.push(problemId);
                  await userDoc.save();
               }
            }
         } catch(e){
            console.error('failed updating user.problemSolved:', e);
         }

      res.status(201).send(submitedResult)


   

      
   } catch (error) {
      console.error('submitCode error:', error);
      res.status(500).send({ error: 'Internal Server Error', message: error.message })
      
   }

}

const runCode = async (req , res)=>{
   // 
    try {
         const userId = (req.user && req.user._id) || (req.result && req.result._id);
      const problemId = req.params.id;
      const {code,language} = req.body;
      if(!userId||!code||!problemId||!language){
         return res.status(400).send("Some Field is Missing")
      }
      // Feching the problem by id
     const problem = await Problem.findById(problemId);
       if(!problem){
          return res.status(404).send("Problem not found")
       }
      // normalize language for storage and judge API
      const langLower = String(language).toLowerCase();
      let judgeLangKey = langLower; // value expected by getLanguageById
      if (langLower === 'cpp') judgeLangKey = 'c++';
      if (langLower === 'js') judgeLangKey = 'javascript';

      const languageId = getLanguageById(judgeLangKey);
      if (!languageId) return res.status(400).send('Unsupported language');

      // map judge key to model enum value
      let storedLanguage = judgeLangKey === 'c++' ? 'cpp' : (judgeLangKey === 'javascript' ? 'JavaScript' : (judgeLangKey === 'java' ? 'Java' : language));

     
       const submission = (Array.isArray(problem.visibalTestCases) ? problem.visibalTestCases : []).map((testCases)=>({
      source_code:code,
      language_id: languageId,
      stdin: testCases.input,
      expected_output: testCases.output
     }))

     const submitResult = await submitBatch(submission)
      const resultToken  = Array.isArray(submitResult) ? submitResult.map((value)=>value.token) : [];

       const testResult = await submitToken(resultToken)

      res.status(201).send(testResult)

   } catch (error) {
      console.error('runCode error:', error);
      res.status(500).send({ error: 'Internal Server Error', message: error.message })
   }

}

module.exports = {submitCode,runCode}