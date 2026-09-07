const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runScripts() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            multipleStatements: true
        });

        console.log('Connected to database.');

        const schemaSql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'schema.sql'), 'utf8');
        console.log('Running schema.sql...');
        await connection.query(schemaSql);
        
        const seedSql = fs.readFileSync(path.join(__dirname, 'src', 'db', 'seed.sql'), 'utf8');
        console.log('Running seed.sql...');
        await connection.query(seedSql);

        console.log('Scripts executed successfully.');
        await connection.end();
    } catch (error) {
        console.error('Error executing scripts:', error);
    }
}

runScripts();
