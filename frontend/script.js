const API_URL = 'http://localhost:3001/api';
const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
    window.location.href = 'login.html';
}

const CURRENT_USER_ID = user.id;
document.getElementById('user-name').textContent = user.HoTen;

// --- HÀM CHUNG ---
function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function openTab(evt, tabName) {
    let tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }
    let tabButtons = document.getElementsByClassName('tab-button');
    for (let i = 0; i < tabButtons.length; i++) {
        tabButtons[i].classList.remove('active');
    }
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    let data;
    try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = {}; // Xử lý DELETE response (không có body)
        }
    } catch (e) {
        data = {}; 
    }

    if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
}

function showMessage(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    if (!el) return; // Kiểm tra nếu element không tồn tại (ví dụ: tab bị ẩn)
    
    el.textContent = message;
    el.className = 'form-message'; // Reset
    
    if (isError) {
        el.classList.add('error');
    } else {
        el.classList.add('success');
    }
    
    setTimeout(() => {
        el.textContent = '';
        el.className = 'form-message';
    }, 3000);
}

// --- CÁC HÀM CHO HỌC VIÊN ---
/**
 * (ĐÃ CẬP NHẬT) Tải bảng tra cứu VÀ danh sách gợi ý
 */
async function loadAllCoursesList() {
    const container = document.getElementById('all-courses-lookup-list');
    // MỚI: Lấy thẻ datalist
    const datalist = document.getElementById('khoahoc-suggestions');

    if (!container) return; // Thoát nếu không phải tab của học viên
    
    container.innerHTML = '<p>Đang tải...</p>';
    datalist.innerHTML = ''; // Xóa gợi ý cũ

    try {
        const courses = await fetchAPI('/khoahoc');
        
        let tableHTML = `<table class="data-table lookup-table"><thead><tr><th>Mã KH</th><th>Tên Khóa Học</th><th>Giáo Viên</th></tr></thead><tbody>`;
        // MỚI: Chuỗi rỗng để chứa các <option>
        let datalistHTML = '';

        courses.forEach(course => {
            // 1. Tạo hàng cho bảng (như cũ)
            tableHTML += `<tr><td><strong>${course.MaKH}</strong></td><td>${course.TenKH}</td><td>${course.TenGiaoVien}</td></tr>`;
            
            // 2. MỚI: Tạo <option> cho datalist
            // value = Mã KH (thứ sẽ được nhập vào ô)
            // text = Tên Khóa Học (thứ hiển thị khi gợi ý)
            datalistHTML += `<option value="${course.MaKH}">${course.TenKH}</option>`;
        });
        
        tableHTML += '</tbody></table>';
        
        // 3. Đổ dữ liệu vào cả 2 nơi
        container.innerHTML = tableHTML;
        datalist.innerHTML = datalistHTML;

    } catch (error) {
        container.innerHTML = '<p>Không thể tải danh sách khóa học.</p>';
    }
}

async function loadMyCourses() {
    try {
        const courses = await fetchAPI(`/hocvien/${CURRENT_USER_ID}/khoahoc`);
        const listContainer = document.getElementById('my-courses-list');
        listContainer.innerHTML = '';
        if (courses.length === 0) {
            listContainer.innerHTML = '<p>Bạn chưa đăng ký khóa học nào.</p>';
            return;
        }
        courses.forEach(course => {
            listContainer.innerHTML += `
                <div class="course-card">
                    <h3>${course.TenKH}</h3>
                    <p class="teacher">GV: ${course.TenGiaoVien}</p>
                    <button class="btn-view" onclick="loadLectures('${course.MaKH}', 'lecture-list-container')">Xem buổi học</button>
                    <button class="btn-delete" style="margin-top: 5px;" onclick="cancelRegistration('${course.MaKH}')">Hủy Đăng Ký</button>
                </div>
            `;
        });
    } catch (error) {
        console.error('Lỗi khi tải khóa học của tôi:', error);
    }
}

async function loadMyCoursesForAttendance() {
    try {
        const courses = await fetchAPI(`/hocvien/${CURRENT_USER_ID}/khoahoc`);
        const courseSelect = document.getElementById('student-course-select');
        if (!courseSelect) return; // Thoát nếu là giáo viên
        
        courseSelect.innerHTML = '<option value="">-- Chọn khóa học --</option>'; // Reset
        
        if (courses.length === 0) {
            return;
        }
        
        courses.forEach(course => {
            courseSelect.innerHTML += `<option value="${course.MaKH}">${course.TenKH}</option>`;
        });
    } catch (error) {
        console.error('Lỗi khi tải khóa học cho dropdown điểm danh:', error);
    }
}

async function loadLecturesForStudentAttendance(maKH) {
    const lectureSelect = document.getElementById('student-lecture-select');
    if (!maKH) {
        lectureSelect.innerHTML = '<option value="">-- Vui lòng chọn khóa học --</option>';
        lectureSelect.disabled = true;
        return;
    }
    lectureSelect.innerHTML = '<option value="">-- Đang tải... --</option>';
    lectureSelect.disabled = true;
    try {
        const lectures = await fetchAPI(`/khoahoc/${maKH}/baigiang`);
        if (lectures.length === 0) {
            lectureSelect.innerHTML = '<option value="">-- Không có buổi học --</option>';
            return;
        }
        
        lectureSelect.innerHTML = '<option value="">-- Chọn buổi học --</option>';
        lectures.forEach(lecture => {
            lectureSelect.innerHTML += `<option value="${lecture.MaBG}">${lecture.TieuDe}</option>`;
        });
        lectureSelect.disabled = false; // Mở khóa dropdown
    } catch (error) {
        console.error('Lỗi khi tải buổi học cho SV:', error);
    }
}

async function registerCourse() {
    const maHV = document.getElementById('reg-mahv').value;
    const maKH = document.getElementById('reg-makh').value;
    if (!maHV || !maKH) {
        showMessage('register-message', 'Vui lòng nhập Mã Khóa Học.', true);
        return;
    }
    try {
        const result = await fetchAPI('/dangky', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ maHV: maHV, maKH: maKH })
        });
        
        showMessage('register-message', result.message);
        loadMyCourses(); // Tải lại danh sách
        loadMyCoursesForAttendance(); // Tải lại dropdown
        document.getElementById('reg-makh').value = '';
    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        showMessage('register-message', 'Lỗi: ' + error.message, true);
    }
}

async function cancelRegistration(maKH) {
    if (!confirm(`Bạn có chắc chắn muốn hủy đăng ký khóa học ${maKH} không?`)) {
        return;
    }
    try {
        const result = await fetchAPI(`/dangky/${CURRENT_USER_ID}/${maKH}`, {
            method: 'DELETE'
        });

        showMessage('schedule-message', result.message || 'Hủy đăng ký thành công!');
        
        loadMyCourses();
        loadMyCoursesForAttendance();
        document.getElementById('lecture-list-container').innerHTML = '<p>Vui lòng chọn "Xem buổi học" từ một khóa học ở trên.</p>';

    } catch (error) {
        console.error('Lỗi khi hủy đăng ký:', error);
        showMessage('schedule-message', 'Lỗi: ' + error.message, true);
    }
}


async function submitAttendance() {
    const maBG = document.getElementById('student-lecture-select').value;
    const trangThai = document.getElementById('student-status-select').value;
    const ghiChu = document.getElementById('student-notes').value;

    if (!maBG) {
        showMessage('attendance-message', 'Vui lòng chọn một buổi học để điểm danh!', true);
        return;
    }
    try {
        const result = await fetchAPI('/diemdanh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                maHV: CURRENT_USER_ID,
                maBG: maBG,
                trangThai: trangThai,
                ghiChu: ghiChu
            })
        });
        showMessage('attendance-message', result.message);
    } catch (error) {
        console.error('Lỗi khi điểm danh:', error);
        showMessage('attendance-message', 'Lỗi: ' + error.message, true);
    }
}

// --- CÁC HÀM CHO GIÁO VIÊN ---
async function loadLectures(maKH, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<p>Đang tải buổi học...</p>';
    try {
        const lectures = await fetchAPI(`/khoahoc/${maKH}/baigiang`);
        if (lectures.length === 0) {
            container.innerHTML = '<p>Khóa học này chưa có buổi học nào.</p>';
            return;
        }
        let tableHTML = `<table class="data-table lecture-table"><thead><tr><th>Buổi học</th><th>Thời gian bắt đầu</th><th>Mô tả</th><th>Link lớp học</th></tr></thead><tbody>`;
        lectures.forEach(lecture => {
            let thoiGian = lecture.ThoiGianBatDau ? new Date(lecture.ThoiGianBatDau).toLocaleString('vi-VN') : 'Chưa xếp lịch';
            let linkHoc = lecture.LinkLopHoc ? `<a href="${lecture.LinkLopHoc}" target="_blank">Vào học</a>` : 'Chưa có link';
            tableHTML += `<tr><td>${lecture.TieuDe}</td><td>${thoiGian}</td><td>${lecture.NoiDungBG || ''}</td><td>${linkHoc}</td></tr>`;
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    } catch (error) {
        container.innerHTML = '<p>Không thể tải danh sách buổi học.</p>';
    }
}

async function loadMyTeachingCourses() {
    try {
        const courses = await fetchAPI(`/giaovien/${CURRENT_USER_ID}/khoahoc`);
        const listContainer = document.getElementById('my-courses-list');
        const courseSelect = document.getElementById('teacher-course-select');
        listContainer.innerHTML = '';
        courseSelect.innerHTML = '<option value="">-- Vui lòng chọn --</option>';
        
        if (courses.length === 0) {
            listContainer.innerHTML = '<p>Bạn chưa được gán dạy khóa học nào.</p>';
            return;
        }
        
        courses.forEach(course => {
            listContainer.innerHTML += `
                <div class="course-card">
                    <h3>${course.TenKH}</h3>
                    <p>${course.MoTa || 'Không có mô tả'}</p>
                    <button class="btn-view" onclick="loadLectures('${course.MaKH}', 'lecture-list-container')">Xem buổi học</button>
                </div>
            `;
            courseSelect.innerHTML += `<option value="${course.MaKH}">${course.TenKH}</option>`;
        });
    } catch (error) {
        console.error('Lỗi khi tải khóa học của giáo viên:', error);
    }
}

async function loadLecturesForTeacher(maKH) {
    const lectureSelect = document.getElementById('teacher-lecture-select');
    lectureSelect.innerHTML = '<option value="">-- Đang tải... --</option>';
    document.getElementById('attendance-list-container').innerHTML = '';
    if (!maKH) {
        lectureSelect.innerHTML = '<option value="">-- Vui lòng chọn khóa học --</option>';
        return;
    }
    try {
        const lectures = await fetchAPI(`/khoahoc/${maKH}/baigiang`);
        if (lectures.length === 0) {
            lectureSelect.innerHTML = '<option value="">-- Không có buổi học --</option>';
            return;
        }
        
        lectureSelect.innerHTML = '<option value="">-- Vui lòng chọn buổi học --</option>';
        lectures.forEach(lecture => {
            lectureSelect.innerHTML += `<option value="${lecture.MaBG}">${lecture.TieuDe}</option>`;
        });
    } catch (error) {
        console.error('Lỗi khi tải buổi học cho GV:', error);
    }
}

async function loadAttendanceList(maBG) {
    const container = document.getElementById('attendance-list-container');
    container.innerHTML = '<p>Đang tải danh sách học viên...</p>';
    if (!maBG) {
        container.innerHTML = '';
        return;
    }
    try {
        const students = await fetchAPI(`/baigiang/${maBG}/diemdanh`);
        if (students.length === 0) {
            container.innerHTML = '<p>Khóa học này chưa có học viên nào đăng ký.</p>';
            return;
        }
        
        let tableHTML = `<table class="data-table attendance-table"><thead><tr><th>Mã HV</th><th>Họ Tên</th><th>Trạng Thái</th><th>Ghi Chú</th></tr></thead><tbody>`;
        
        students.forEach((student) => {
            const trangThai = student.TrangThai || 'Chưa điểm danh';
            const ghiChu = student.GhiChu || '';
            
            tableHTML += `
                <tr>
                    <td>${student.MaHV}</td>
                    <td>${student.HoTen}</td>
                    <td>${trangThai}</td>
                    <td>${ghiChu}</td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    } catch (error) {
        console.error('Lỗi khi tải danh sách điểm danh:', error);
    }
}

async function loadCourseStats() {
    const container = document.getElementById('stats-container');
    container.innerHTML = '<p>Đang tải thống kê...</p>';
    try {
        const stats = await fetchAPI(`/thongke/khoahoc`);
        
        let tableHTML = `<table class="data-table"><thead><tr><th>Mã KH</th><th>Tên Khóa Học</th><th>Giáo Viên</th><th>Sĩ số</th></tr></thead><tbody>`;
        
        stats.forEach((row) => {
            tableHTML += `
                <tr>
                    <td>${row.MaKH}</td>
                    <td>${row.TenKH}</td>
                    <td>${row.TenGiaoVien}</td>
                    <td><strong>${row.SoLuongHocVien}</strong></td>
                </tr>
            `;
        });
        tableHTML += '</tbody></table>';
        container.innerHTML = tableHTML;
    } catch (error) {
        console.error('Lỗi khi tải thống kê:', error);
        container.innerHTML = '<p>Không thể tải thống kê.</p>';
    }
}

// --- CHẠY KHI TẢI TRANG (PHÂN QUYỀN) ---
document.addEventListener('DOMContentLoaded', () => {
    if (user.role === 'HocVien') {
        // --- CẤU HÌNH CHO HỌC VIÊN ---
        loadAllCoursesList();
        loadMyCourses();
        loadMyCoursesForAttendance(); 
        document.getElementById('reg-mahv').value = CURRENT_USER_ID;
        document.getElementById('teacher-attendance-view').remove();
        document.getElementById('btn-tab-stats').remove(); 
        document.getElementById('stats-section').remove(); 
        document.getElementById('btn-tab-schedule').click();

    } else if (user.role === 'GiaoVien') {
        // --- CẤU HÌNH CHO GIÁO VIÊN ---
        document.getElementById('btn-tab-register').textContent = 'Quản lý Đăng ký';
        document.getElementById('btn-tab-schedule').textContent = 'Khóa học của tôi';
        document.getElementById('btn-tab-attendance').textContent = 'Xem Điểm danh';
        document.getElementById('btn-tab-stats').style.display = 'block'; 
        
        document.getElementById('my-courses-title').textContent = 'Khóa học bạn đang dạy';
        document.getElementById('lecture-list-title').textContent = 'Danh sách Buổi học (của khóa học)';
        
        document.getElementById('btn-tab-register').style.display = 'none';
        document.getElementById('register-section').remove(); 
        document.getElementById('student-attendance-view').remove();
        document.getElementById('teacher-attendance-view').style.display = 'block';

        // Tải dữ liệu cho Giáo viên
        loadMyTeachingCourses();
        loadCourseStats(); // Tải thống kê

        // Mở tab mặc định
        document.getElementById('btn-tab-schedule').click();
    }
});