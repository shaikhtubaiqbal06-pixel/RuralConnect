import express from 'express';
import { getInventory, updateInventory } from '../controllers/inventory.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, requireRole('ENTREPRENEUR'), getInventory);
router.post('/adjust', requireAuth, requireRole('ENTREPRENEUR'), updateInventory);

export default router;
