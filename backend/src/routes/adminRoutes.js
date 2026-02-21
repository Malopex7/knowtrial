import express from 'express';
import { getAllSources, getGlobalTags, updateGlobalTag, deleteGlobalTag } from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/admin/sources
router.get('/sources', protect, adminOnly, getAllSources);

// Tags
router.get('/tags', protect, adminOnly, getGlobalTags);
router.put('/tags', protect, adminOnly, updateGlobalTag);
router.delete('/tags', protect, adminOnly, deleteGlobalTag);

export default router;
