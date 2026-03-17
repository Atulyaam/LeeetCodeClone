const express = require('express');
const router = express.Router();
const userAuth = require('../middleware/userMiddleware');
const isAdmin = require('../middleware/adminMiddleware');
const { createMission, getAllMissions, getMissionById, claimMissionReward } = require('../controllers/mission');

// Public/User Routes
router.get('/all', userAuth, getAllMissions);
router.get('/:id', userAuth, getMissionById);
router.post('/claim/:id', userAuth, claimMissionReward);

// Admin Routes
router.post('/create', userAuth, isAdmin, createMission);

module.exports = router;
