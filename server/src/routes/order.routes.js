import express from 'express';
import { createOrder, getOrderById, getOrders, updateOrderStatus } from '../controllers/order.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, getOrders);
router.get('/:id', requireAuth, getOrderById);
router.post('/', requireAuth, requireRole('CUSTOMER'), createOrder);
router.patch('/:id/status', requireAuth, updateOrderStatus);

export default router;
