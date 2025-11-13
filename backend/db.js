
const mysql = require('mysql2');

// Tạo một "pool" kết nối để tái sử dụng
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',       
    password: '',       
    database: 'lophoc', 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool.promise();