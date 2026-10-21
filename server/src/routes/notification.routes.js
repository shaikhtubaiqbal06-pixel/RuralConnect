import express from 'express';
import { getNotifications, markNotificationAsRead } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getNotifications);
router.patch('/:id/read', requireAuth, markNotificationAsRead);

export default router;
