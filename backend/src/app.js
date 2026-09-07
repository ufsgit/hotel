const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

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
