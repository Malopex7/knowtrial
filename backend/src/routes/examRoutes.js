import express from 'express';
import { generateExam } from '../controllers/examController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/exams/generate
router.post('/generate', protect, generateExam);

export default router;
