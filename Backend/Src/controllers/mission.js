const Mission = require('../models/mission');
const User = require('../models/users');

// Create a new mission (Admin only)
const createMission = async (req, res) => {
   try {
      const { title, description, points, problems } = req.body;
      const creator = req.user._id;

      if (!title || !description || !problems || problems.length === 0) {
         return res.status(400).send("Please provide all required fields including at least one problem.");
      }

      const newMission = new Mission({
         title,
         description,
         points: points || 100,
         problems,
         creator
      });

      await newMission.save();
      res.status(201).json({ message: "Mission created successfully", mission: newMission });
   } catch (error) {
      console.error("Create Mission Error:", error);
      res.status(500).send("Error creating mission.");
   }
};

// Get all active missions (Public/User)
const getAllMissions = async (req, res) => {
   try {
      const missions = await Mission.find({ isActive: true })
         .populate('problems', 'title difficulty tags')
         .populate('creator', 'firstName lastName');
      res.status(200).json(missions);
   } catch (error) {
      console.error("Get All Missions Error:", error);
      res.status(500).send("Error fetching missions.");
   }
};

// Get single mission detailing problem statuses (Public/User)
const getMissionById = async (req, res) => {
   try {
      const { id } = req.params;
      const mission = await Mission.findById(id).populate('problems', 'title difficulty tags');
      if (!mission) {
         return res.status(404).send("Mission not found");
      }
      res.status(200).json(mission);
   } catch (error) {
      console.error("Get Mission Error:", error);
      res.status(500).send("Error fetching mission details.");
   }
};

// Claim Mission Reward (Logic to verify if user solved all problems in the mission)
const claimMissionReward = async (req, res) => {
   try {
      const { id } = req.params;
      const userId = req.user._id;

      const mission = await Mission.findById(id).populate('problems');
      if (!mission || !mission.isActive) {
         return res.status(404).send("Mission not found or inactive.");
      }

      const user = await User.findById(userId);

      // Check if already claimed
      if (user.completedMissions.includes(mission._id)) {
         return res.status(400).send("Mission reward already claimed.");
      }

      // Check if user solved ALL problems in this mission
      // user.problemSolved contains ObjectIds of solved problems
      const solvedArr = user.problemSolved.map(p => p.toString());
      const allSolved = mission.problems.every(problem => solvedArr.includes(problem._id.toString()));

      if (!allSolved) {
         return res.status(400).send("You have not solved all problems required for this mission.");
      }

      // Grant rewards
      user.completedMissions.push(mission._id);
      user.totalPoints += mission.points;
      await user.save();

      res.status(200).json({ message: "Mission completed successfully! Points awarded.", pointsEarned: mission.points, totalPoints: user.totalPoints });
   } catch (error) {
      console.error("Claim Mission Error:", error);
      res.status(500).send("Error claiming mission reward.");
   }
};

module.exports = {
   createMission,
   getAllMissions,
   getMissionById,
   claimMissionReward
};
