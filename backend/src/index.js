// src/index.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// Enable CORS for frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

if (process.env.FRONTEND_URL) {
  // Add the Vercel frontend URL, removing trailing slash if present
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    // Check if origin is in the explicit allowedOrigins list
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Securely allow Vercel preview URLs for this project ONLY
    // e.g., https://knowtrial-frontend-git-main-malopex7s-projects.vercel.app
    if (origin.startsWith('https://knowtrial') && origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    const msg = 'The CORS policy for this site does not allow access from the specified Origin: ' + origin;
    return callback(new Error(msg), false);
  },
  credentials: true
}));

app.use(express.json());

// Connect to MongoDB (use MONGO_URI from .env)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

import authRoutes from './routes/authRoutes.js';
import sourceRoutes from './routes/sourceRoutes.js';
import examRoutes from './routes/examRoutes.js';
import attemptRoutes from './routes/attemptRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/admin', adminRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working' });
});

// Start server (only if not running in Vercel serverless environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

// Export the app instance for Vercel serverless functions
export default app;
