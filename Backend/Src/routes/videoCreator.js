const express = require('express')
const adminMiddleware = require('../middleware/adminMiddleware')
const userMiddleware = require('../middleware/userMiddleware')
const videoRouter = express.Router();
const {generateUploadSignature, saveVideoMetaData, getVideoByProblem, deleteVideo} = require("../controllers/videoSection")

videoRouter.post('/upload-signature',adminMiddleware,generateUploadSignature)
videoRouter.get('/problem/:problemId',userMiddleware,getVideoByProblem)
videoRouter.post('/save',adminMiddleware,saveVideoMetaData)
videoRouter.delete('/problem/:problemId',adminMiddleware,deleteVideo)
videoRouter.delete("/delete/:videoId",adminMiddleware,deleteVideo);

module.exports = videoRouter;