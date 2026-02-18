import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
    createSource,
    getSources,
    getSource,
    deleteSource,
} from '../controllers/sourceController.js';

const router = express.Router();

// Multer: store files in memory (will be piped to GridFS in the controller)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

router.route('/')
    .post(protect, upload.single('file'), createSource)
    .get(protect, getSources);

router.route('/:id')
    .get(protect, getSource)
    .delete(protect, deleteSource);

export default router;
