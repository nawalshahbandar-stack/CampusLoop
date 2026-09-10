const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

// Test Database Connection
pool.connect()
    .then(() => {
        console.log("✅ PostgreSQL Connected Successfully!");
    })
    .catch((err) => {
        console.log("❌ Database Connection Failed!");
        console.log(err.message);
    });

module.exports = pool;