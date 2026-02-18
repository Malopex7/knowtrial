import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
    createSource,
    getSources,
    getSource,
    deleteSource,
    updateSource,
} from '../controllers/sourceController.js';


const router = express.Router();

router.route('/')
    .post(protect, createSource)
    .get(protect, getSources);

router.route('/:id')
    .get(protect, getSource)
    .delete(protect, deleteSource)
    .patch(protect, updateSource);

export default router;
