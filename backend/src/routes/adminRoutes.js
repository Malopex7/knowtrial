import express from 'express';
import { getAllSources } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/admin/sources
router.get('/sources', protect, adminOnly, getAllSources);

export default router;
