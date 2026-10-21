import express from 'express';
import { getDashboardData } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/dashboard', requireAuth, getDashboardData);

export default router;
