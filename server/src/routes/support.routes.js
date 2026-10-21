import express from 'express';
import { addMessage, createConversation, getSupportConversations } from '../controllers/support.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getSupportConversations);
router.post('/', requireAuth, createConversation);
router.post('/message', requireAuth, addMessage);

export default router;
