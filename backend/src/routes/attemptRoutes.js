import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { submitAttempt, getAttempt, getAttempts } from '../controllers/attemptController.js';

const router = express.Router();

router.use(protect); // All routes protected

// POST /api/attempts -> Submit an attempt
router.post('/', submitAttempt);

// GET /api/attempts -> Get all attempts for user
router.get('/', getAttempts);

// GET /api/attempts/:id -> Get specific attempt
router.route('/:id').get(getAttempt);

export default router;
