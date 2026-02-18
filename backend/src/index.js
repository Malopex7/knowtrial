// src/index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(express.json());

// Connect to MongoDB (use MONGO_URI from .env)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

import authRoutes from './routes/authRoutes.js';

import sourceRoutes from './routes/sourceRoutes.js';
import examRoutes from './routes/examRoutes.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/exams', examRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working' });
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));

// Force restart for port change 
