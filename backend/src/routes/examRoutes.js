import express from 'express';
import { generateExam, generateWeaknessExam, getExams, getExam, getExamQuestions } from '../controllers/examController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/exams/weakness (Must be above /:id routes)
router.post('/weakness', protect, generateWeaknessExam);

// POST /api/exams/generate
router.post('/generate', protect, generateExam);

// GET /api/exams
router.get('/', protect, getExams);

// GET /api/exams/:id
router.get('/:id', protect, getExam);

// GET /api/exams/:id/questions
router.get('/:id/questions', protect, getExamQuestions);

export default router;
