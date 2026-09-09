const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());

// Serve uploaded files as static assets
app.use('/uploads', express.static(uploadsDir));

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Import routes
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
