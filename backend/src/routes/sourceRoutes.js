import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
    createSource,
    getSources,
    getSource,
    deleteSource,
    updateSource,
    getSourceChunks,
} from '../controllers/sourceController.js';

// Store file in memory so we can pass the buffer to GridFS
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB cap
});

const router = express.Router();

router.route('/')
    // upload.single('file') parses multipart/form-data AND puts other fields in req.body
    .post(protect, upload.single('file'), createSource)
    .get(protect, getSources);

router.route('/:id')
    .get(protect, getSource)
    .delete(protect, deleteSource)
    .patch(protect, updateSource);

router.route('/:id/chunks')
    .get(protect, getSourceChunks);

export default router;
