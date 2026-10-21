import express from 'express';
import { createProduct, deleteProduct, getMyProducts, getProductById, getProducts, updateProduct } from '../controllers/product.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/mine', requireAuth, requireRole('ENTREPRENEUR'), getMyProducts);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', requireAuth, createProduct);
router.put('/:id', requireAuth, updateProduct);
router.delete('/:id', requireAuth, deleteProduct);

export default router;
