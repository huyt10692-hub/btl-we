// file: backend/server.js
const express = require('express');
const cors = require('cors');
const db = require('./db'); 

const app = express();
const PORT = 3001; 

app.use(cors()); 
app.use(express.json()); 

// --- API Routes ---

/* API 1: Lấy danh sách Khóa học */
app.get('/api/khoahoc', async (req, res) => {
    try {
        const sql = `
            SELECT kh.MaKH, kh.TenKH, kh.MoTa, gv.HoTen AS TenGiaoVien 
            FROM KhoaHoc kh
            JOIN GiaoVien gv ON kh.MaGV = gv.MaGV
            ORDER BY kh.MaKH ASC
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi khi truy vấn khóa học:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/* API 2: Lấy các khóa học MỘT HỌC VIÊN đã đăng ký */
app.get('/api/hocvien/:maHV/khoahoc', async (req, res) => {
    try {
        const { maHV } = req.params;
        const sql = `
            SELECT DISTINCT 
                kh.MaKH, 
                kh.TenKH, 
                kh.MoTa, 
                gv.HoTen AS TenGiaoVien
            FROM KhoaHoc kh
            JOIN DangKyHoc dk ON kh.MaKH = dk.MaKH
            JOIN GiaoVien gv ON kh.MaGV = gv.MaGV
            WHERE dk.MaHV = ?
        `;
        const [rows] = await db.query(sql, [maHV]);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi khi truy vấn khóa học của học viên:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/* API 3: Đăng ký một khóa học */
app.post('/api/dangky', async (req, res) => {
    try {
        const { maHV, maKH } = req.body;
        
        const sql = 'INSERT INTO DangKyHoc (MaHV, MaKH) VALUES (?, ?)';
        await db.query(sql, [maHV, maKH]);

        res.status(201).json({ message: 'Đăng ký khóa học thành công!' });
    } catch (err) {
        console.error('Lỗi khi đăng ký khóa học:', err);
        res.status(500).json({ error: 'Lỗi máy chủ hoặc đã đăng ký rồi' });
    }
});

/* API 4: Điểm danh online */
app.post('/api/diemdanh', async (req, res) => {
    try {
        const { maHV, maBG, trangThai, ghiChu } = req.body;
        
        const sql = `
            INSERT INTO DiemDanh (MaHV, MaBG, TrangThai, GhiChu) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE TrangThai = ?, GhiChu = ?
        `;
        const values = [maHV, maBG, trangThai, ghiChu, trangThai, ghiChu];
        
        await db.query(sql, values);
        res.status(201).json({ message: 'Điểm danh thành công!' });

    } catch (err) {
        console.error('Lỗi khi điểm danh:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/* API 5: Xử lý Đăng nhập */
app.post('/api/login', async (req, res) => {
    try {
        const { email, matkhau } = req.body;

        if (!email || !matkhau) {
            return res.status(400).json({ error: 'Vui lòng nhập Email và Mật khẩu.' });
        }

        const sql = `
            (SELECT MaHV AS id, HoTen, 'HocVien' AS role 
             FROM HocVien 
             WHERE Email = ? AND MatKhau = ?)
            UNION
            (SELECT MaGV AS id, HoTen, 'GiaoVien' AS role 
             FROM GiaoVien 
             WHERE Email = ? AND MatKhau = ?)
        `;
        
        const [rows] = await db.query(sql, [email, matkhau, email, matkhau]);

        if (rows.length > 0) {
            const user = rows[0];
            res.json({ message: 'Đăng nhập thành công!', user: user });
        } else {
            res.status(401).json({ error: 'Email hoặc Mật khẩu không đúng.' });
        }

    } catch (err) {
        console.error('Lỗi khi đăng nhập:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/* API 6: Lấy danh sách Bài giảng của một Khóa học */
app.get('/api/khoahoc/:maKH/baigiang', async (req, res) => {
    try {
        const { maKH } = req.params;
        const sql = `
            SELECT MaBG, TieuDe, NoiDungBG, ThoiGianBatDau, LinkLopHoc 
            FROM BaiGiang 
            WHERE MaKH = ? 
            ORDER BY ThoiGianBatDau
        `;
        const [rows] = await db.query(sql, [maKH]);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi khi truy vấn bài giảng:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/* API 7: Lấy các khóa học MỘT GIÁO VIÊN đang dạy */
app.get('/api/giaovien/:maGV/khoahoc', async (req, res) => {
    try {
        const { maGV } = req.params;
        const sql = `
            SELECT MaKH, TenKH, MoTa 
            FROM KhoaHoc
            WHERE MaGV = ?
        `;
        const [rows] = await db.query(sql, [maGV]);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi khi truy vấn khóa học của giáo viên:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/* API 8: (TRUY VẤN 3) Lấy danh sách điểm danh của 1 bài giảng */
app.get('/api/baigiang/:maBG/diemdanh', async (req, res) => {
    try {
        const { maBG } = req.params;

        const [courseRows] = await db.query('SELECT MaKH FROM BaiGiang WHERE MaBG = ?', [maBG]);
        if (courseRows.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy bài giảng.' });
        }
        const maKH = courseRows[0].MaKH;

        const sql = `
            SELECT 
                hv.MaHV, 
                hv.HoTen, 
                dd.TrangThai, 
                dd.GhiChu
            FROM DangKyHoc dk
            JOIN HocVien hv ON dk.MaHV = hv.MaHV
            LEFT JOIN DiemDanh dd ON hv.MaHV = dd.MaHV AND dd.MaBG = ?
            WHERE dk.MaKH = ?
            ORDER BY hv.HoTen
        `;
        
        const [attendanceRows] = await db.query(sql, [maBG, maKH]);
        res.json(attendanceRows);

    } catch (err) {
        console.error('Lỗi khi lấy danh sách điểm danh:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/* API 9: (TRUY VẤN 4 - JOIN + GROUP BY + AGGREGATE) Thống kê số lượng học viên */
app.get('/api/thongke/khoahoc', async (req, res) => {
    try {
        const sql = `
            SELECT 
                kh.MaKH, 
                kh.TenKH, 
                gv.HoTen AS TenGiaoVien,
                COUNT(dk.MaHV) AS SoLuongHocVien
            FROM KhoaHoc kh
            JOIN GiaoVien gv ON kh.MaGV = gv.MaGV
            LEFT JOIN DangKyHoc dk ON kh.MaKH = dk.MaKH
            GROUP BY kh.MaKH, kh.TenKH, gv.HoTen
            ORDER BY kh.MaKH ASC
        `;
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi khi lấy thống kê khóa học:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/* API 10: Hủy đăng ký khóa học */
app.delete('/api/dangky/:maHV/:maKH', async (req, res) => {
    try {
        const { maHV, maKH } = req.params;

        const sql = 'DELETE FROM DangKyHoc WHERE MaHV = ? AND MaKH = ?';
        const [result] = await db.query(sql, [maHV, maKH]);

        if (result.affectedRows > 0) {
            res.json({ message: 'Hủy đăng ký thành công!' });
        } else {
            res.status(404).json({ error: 'Không tìm thấy lượt đăng ký này.' });
        }
    } catch (err) {
        console.error('Lỗi khi hủy đăng ký:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});

/*
 * API 11: (ĐÃ CẬP NHẬT) Đăng ký tài khoản Học viên
 */
app.post('/api/register', async (req, res) => {
    try {
        // Lấy thêm ngaySinh từ body
        const { maHV, hoTen, email, matKhau, ngaySinh } = req.body;

        // 1. Kiểm tra đầu vào (đã thêm ngaySinh)
        if (!maHV || !hoTen || !email || !matKhau || !ngaySinh) {
            return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });
        }

        // 2. Kiểm tra xem MaHV hoặc Email đã tồn tại chưa
        const checkSql = 'SELECT * FROM HocVien WHERE MaHV = ? OR Email = ?';
        const [existingUsers] = await db.query(checkSql, [maHV, email]);

        if (existingUsers.length > 0) {
            if (existingUsers[0].MaHV === maHV) {
                return res.status(409).json({ error: 'Mã học viên này đã tồn tại.' }); // 409 Conflict
            }
            if (existingUsers[0].Email === email) {
                return res.status(409).json({ error: 'Email này đã được sử dụng.' });
            }
        }

        // 3. Nếu chưa tồn tại, thêm mới (thêm cột NgaySinh)
        const insertSql = 'INSERT INTO HocVien (MaHV, HoTen, NgaySinh, Email, MatKhau) VALUES (?, ?, ?, ?, ?)';
        await db.query(insertSql, [maHV, hoTen, ngaySinh, email, matKhau]);

        res.status(201).json({ message: 'Đăng ký tài khoản thành công!' });

    } catch (err) {
        console.error('Lỗi khi đăng ký tài khoản:', err);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
});


// Khởi động máy chủ
app.listen(PORT, () => {
    console.log(`Backend server đang chạy tại http://localhost:${PORT}`);
});