const cloudinary = require('cloudinary').v2;
const Problem = require("../models/problems")
const SolutionVideo = require("../models/solutionVideo")


cloudinary.config({
   cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
   api_key:process.env.CLOUDINARY_API_KEY,
   api_secret:process.env.CLOUDINARY_API_SECRET
})

const generateUploadSignature = async(req,res)=>{
   try {
      const {problemId} = req.body
      // verify problem is exist
      const problem = await Problem.findById(problemId);
      if(!problem){
         return res.status(404).json({
            error:'problem not found'
         })
      }
      const userId = req.user && req.user._id;
      if(!userId){
         return res.status(401).json({
            error:'Unauthorized'
         })
      }
      // genratting usinque public id for vide
      const timestamp = Math.round(new Date().getTime()/1000);
      const publicId = `leetcode-solutions/${problemId}/${userId}_${timestamp}`
      // uploading parametrs
      const uploadParams = {
         timestamp:timestamp,
         public_id:publicId
      };

      // generating generateUploadSignature
      const signature = cloudinary.utils.api_sign_request(
         uploadParams,
         process.env.CLOUDINARY_API_SECRET
      );
      res.json({
         signature,
         timestamp,
         public_id:publicId,
         api_key:process.env.CLOUDINARY_API_KEY,
         cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
         upload_url:`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`
      })
   } catch (error) {
      console.error("error genrating uplaod signature: ", error)
      res.status(500).json({
         error:"Failed to genrate uplaod credentials"
      })
      
   }

}

const saveVideoMetaData = async (req,res)=>{
   try {
      const {
         problemId,
         cloudinaryPublicId,
         secureUrl,
         duration
      } = req.body
      const userId = req.user && req.user._id;

      if(!problemId || !cloudinaryPublicId){
         return res.status(400).json({
            error:'problemId and cloudinaryPublicId are required'
         })
      }

      const problem = await Problem.findById(problemId);
      if(!problem){
         return res.status(404).json({
            error:'problem not found'
         })
      }

      // verify the uplaod with cloudinary
      const cloudinaryResource = await cloudinary.api.resource(
         cloudinaryPublicId,
         {resource_type:'video'}
      )
      if(!cloudinaryResource){
         return res.status(400).json({
            error:'video not found on cloudinary'
         })
      }

      const existingVideo = await SolutionVideo.findOne({ problemId })
      const thumbnailUrl  = cloudinary.url(cloudinaryResource.public_id,{
         resource_type:'video',
         transformation:[
            {width:400,height:225,crop:'fill'},
            {quality:'auto'},
            {start_offset:'auto'}
         ],
         format:'jpg'
      });

      if(existingVideo && existingVideo.cloudinaryPublicId !== cloudinaryPublicId){
         try {
            await cloudinary.uploader.destroy(existingVideo.cloudinaryPublicId,{
               resource_type:'video',
               invalidate:true
            })
         } catch (err) {
            console.error('failed to delete previous cloudinary video:', err)
         }
      }

      // create video  solution record
      const videoSolution = await SolutionVideo.findOneAndUpdate(
         { problemId },
         {
            problemId,
            uploaderId:userId,
            cloudinaryPublicId,
            secureUrl: secureUrl || cloudinaryResource.secure_url,
            duration:cloudinaryResource.duration || duration || 0,
            thumbnailUrl
         },
         { new:true, upsert:true, setDefaultsOnInsert:true }
      )

      res.status(200).json({
         message:'video solution uploaded Succssfully',
         videoSolution
      })
   } catch (error) {
      console.error('save video metadata error:', error)
      res.status(500).json({
         error:'Failed to save video metadata'
      })
      
   }

}

const getVideoByProblem = async (req,res)=>{
   try {
      const { problemId } = req.params;
      if(!problemId){
         return res.status(400).json({
            error:'problemId is required'
         })
      }

      const videoSolution = await SolutionVideo.findOne({ problemId }).select(
         'problemId secureUrl duration thumbnailUrl cloudinaryPublicId uploaderId createdAt updatedAt'
      )
      if(!videoSolution){
         return res.status(404).json({
            error:'video solution not found'
         })
      }

      return res.status(200).json(videoSolution)
   } catch (error) {
      console.error('get video by problem error:', error)
      return res.status(500).json({
         error:'Failed to fetch video solution'
      })
   }
}

const deleteVideo = async (req, res)=>{
   try {
      const { problemId, videoId } = req.params;
      let videoSolution = null;

      if(problemId){
         videoSolution = await SolutionVideo.findOne({ problemId })
      } else if(videoId){
         videoSolution = await SolutionVideo.findById(videoId)
      }

      if(!videoSolution){
         return res.status(404).json({
            error:'video solution not found'
         })
      }

      try {
         await cloudinary.uploader.destroy(videoSolution.cloudinaryPublicId,{
            resource_type:'video',
            invalidate:true
         })
      } catch (err) {
         console.error('failed to delete video from cloudinary:', err)
      }

      await SolutionVideo.findByIdAndDelete(videoSolution._id)

      return res.status(200).json({
         message:'video solution deleted successfully'
      })
   } catch (error) {
      console.error('delete video error:', error)
      return res.status(500).json({
         error:'Failed to delete video solution'
      })
   }
}



module.exports = {
   generateUploadSignature,
   saveVideoMetaData,
   getVideoByProblem,
   deleteVideo
}