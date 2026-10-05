# Hướng dẫn chạy RideUp end-to-end

> File này dành cho việc test thủ công toàn bộ flow: backend → customer app → driver app → admin app duyệt.

---

## 1. Chuẩn bị môi trường

Cần cài sẵn trên máy:
- **Java 21** + **Maven 3.x** (cho backend)
- **Node.js 20+** + **npm** (cho 3 web app + Expo mobile)
- **MySQL 8** chạy ở `localhost:3306`, DB `rideup`, user `root` / `root`
- **Redis 7** chạy ở `localhost:6379`
- (Optional) **Expo Go app** trên điện thoại để test mobile
- (Optional) Git Bash / PowerShell / CMD — hướng dẫn dùng Git Bash

> **Không muốn cài Node.js?** Chỉ cần backend — dùng Swagger UI tại `http://localhost:8080/api/swagger-ui.html` để gọi API trực tiếp.

### 1.1. Check Redis

```bash
redis-cli ping
# → PONG = OK
# → "Connection refused" = chưa có, cần start
```

Nếu chưa có Redis:
```bash
choco install redis-64 -y    # cần admin PowerShell
redis-server               # chạy foreground
# hoặc cài qua Memurai/Docker nếu muốn
```

### 1.2. Tạo database (1 lần)

```bash
mysql -u root -proot < D:/OneDrive/Desktop/RideUp/db/create_database.sql
```

Hoặc mở MySQL client, chạy:
```sql
CREATE DATABASE IF NOT EXISTS rideup
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Hibernate sẽ tự tạo các bảng (ddl-auto: update).

### 1.3. Bootstrap admin (1 lần)

```sql
SELECT UUID() INTO @admin_id;
INSERT INTO app_user (id, full_name, phone, email, password, verified, created_at, updated_at)
VALUES (@admin_id, 'Admin', '0900000000', 'admin@rideup.com',
        '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        1, NOW(), NOW());
INSERT INTO user_roles (user_id, role) VALUES (@admin_id, 'ADMIN');
```

Hash trên = password `admin123`. Nếu login không được, generate lại hash tại https://bcrypt-generator.com (rounds=10).

---

## 2. Khởi động Backend

Mở **Git Bash / Terminal 1**:

```bash
cd D:/OneDrive/Desktop/RideUp/rideup-backend
mvn spring-boot:run
```

Chờ đến khi thấy:
```
Started RideUpApplication in X seconds
Tomcat started on port 8080
SimpleBrokerMessageHandler : Started
```

| Endpoint | URL |
|---|---|
| API root | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/api/swagger-ui.html |
| WebSocket | ws://localhost:8080/api/ws |

---

## 3. Seed location (63 tỉnh + ~3,300 phường/xã)

Qua **Swagger UI** hoặc **curl**:

### 3.1. Login admin

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/authentication \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@rideup.com","password":"admin123"}' \
  | python -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")
echo "Token: $ADMIN_TOKEN"
```

### 3.2. Trigger seed

```bash
curl -X POST http://localhost:8080/api/admin/locations/seed \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Response (sau ~5-10 phút):
```json
{
  "code": 200,
  "message": "Cào dữ liệu hoàn tất: 63 tỉnh, 3321 phường/xã",
  "data": { "provinceCount": 63, "wardCount": 3321 }
}
```

### 3.3. Verify

```bash
curl http://localhost:8080/api/locations/provinces | python -m json.tool | head -20
```

Phải thấy 63 tỉnh với trường `code` (HCM, HN, DN, ...).

---

## 4. Frontend Customer (port 5173)

Mở **Git Bash / Terminal 2**:

```bash
cd D:/OneDrive/Desktop/RideUp/rideup-customer
npm install   # chỉ lần đầu
npm run dev
```

Mở browser: **http://localhost:5173**

---

## 4b. Mobile Customer app (Expo + React Native)

Mở **Git Bash / Terminal 2b**:

```bash
cd D:/OneDrive/Desktop/RideUp/rideup-customer-mobile
npm install   # chỉ lần đầu
npx expo start
```

Sau đó:
- **Test trên điện thoại thật**: cài app **Expo Go** (iOS/Android), scan QR trong terminal
- **iOS Simulator**: nhấn `i` trong terminal
- **Android Emulator**: nhấn `a` trong terminal

API mặc định `http://localhost:8080/api`. Nếu backend ở máy khác, override:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080/api npx expo start
```

Xem chi tiết stack và structure tại `rideup-customer-mobile/README.md`.

---

## 5c. Mobile Driver app (Expo + React Native)

```bash
cd D:/OneDrive/Desktop/RideUp/rideup-driver-mobile
npm install
npx expo start
```

Có thêm `expo-image-picker` để chụp/chọn ảnh CCCD/GPLX. App sẽ xin quyền **Camera**, **Photo Library**, **Location** khi cần.

Xem chi tiết tại `rideup-driver-mobile/README.md`.

## 5d. Mobile Admin app (Expo + React Native)

```bash
cd D:/OneDrive/Desktop/RideUp/rideup-admin-mobile
npm install
npx expo start
```

Login mặc định `admin@rideup.com` / `admin123`. Dashboard có 3 tab: Tài xế chờ duyệt / Xe chờ duyệt / Thống kê.

Xem chi tiết tại `rideup-admin-mobile/README.md`.

---

## 5. Frontend Driver (port 5174)

Mở **Git Bash / Terminal 3**:

```bash
cd D:/OneDrive/Desktop/RideUp/rideup-driver
npm install   # chỉ lần đầu
npm run dev
```

Mở browser **cửa sổ riêng** (có thể ẩn danh): **http://localhost:5174**

---

## 5b. Frontend Admin (port 5175)

Mở **Git Bash / Terminal 4**:

```bash
cd D:/OneDrive/Desktop/RideUp/rideup-admin
npm install   # chỉ lần đầu
npm run dev
```

Mở browser **cửa sổ riêng**: **http://localhost:5175**

Trang admin có 2 màn hình:
- `/login` — đăng nhập với `admin@rideup.com` / `admin123`
- `/dashboard` — duyệt driver PENDING + duyệt vehicle PENDING

---

## 6. Script test E2E (làm theo thứ tự)

### Bước A: Tạo customer

Ở tab **Customer** (5173):
1. Click **Đăng ký**
2. Điền form:
   - Họ tên: `Nguyễn Văn Khách`
   - Email: `khach@test.com`
   - SĐT: `0987654321`
   - Password: `12345678`
3. Submit → tự login → vào `/home`

✅ Verify: thấy nút "🔍 Tìm chuyến xe" và "📋 Chuyến của tôi"

### Bước B: Tạo driver mới (qua Swagger UI — vì cần upload file)

1. Mở **Swagger UI** (http://localhost:8080/api/swagger-ui.html)
2. Vào `POST /api/driver/register`
3. Click **Try it out**
4. Chuẩn bị 3 file ảnh JPG nhỏ (~100KB), đặt tên:
   - `cccd-front.jpg`
   - `cccd-back.jpg`
   - `gplx.jpg`

   Trên Windows, có thể tạo nhanh bằng Paint hoặc copy từ bất kỳ ảnh nào.

5. Điền form:
   ```
   fullName:         Nguyễn Văn Tài
   email:            taixe@test.com
   password:         12345678
   phone:            0912345678
   cccd:             012345678901  (12 chữ số)
   gplx:             12345678       (8 chữ số)
   gplxExpiryDate:   2030-12-31
   ```
6. Upload 3 file ảnh
7. Click **Execute**
8. Response 200 → copy `accessToken`

### Bước C: Admin duyệt driver (qua Admin app hoặc Swagger UI)

**Cách 1: Admin app (5175)** — nhanh nhất
1. Mở http://localhost:5175 → login admin
2. Vào Dashboard → tab **Drivers** → thấy driver PENDING
3. Click **Approve** → status chuyển APPROVED

**Cách 2: Swagger UI**
1. Trong Swagger, vào `POST /auth/authentication` → đăng nhập admin → lấy token
2. Authorize với admin token
3. Vào `GET /api/admin/drivers?status=PENDING` → copy `id` của driver
4. Vào `POST /api/admin/drivers/{id}/approve` → Execute

**Cách 3: curl (Git Bash)**
```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/authentication \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@rideup.com","password":"admin123"}' \
  | python -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

DRIVER_ID=$(curl -s http://localhost:8080/api/admin/drivers?status=PENDING \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python -c "import sys, json; print(json.load(sys.stdin)['data'][0]['id'])")
echo "Driver ID: $DRIVER_ID"

curl -X POST http://localhost:8080/api/admin/drivers/$DRIVER_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Bước D: Đăng ký xe cho driver (qua Driver app UI)

Ở tab **Driver** (5174):
1. **Đăng nhập** với `taixe@test.com` / `12345678`
   → Vào thẳng `/driver` (vì đã approved)
2. Click nút **Đăng ký xe** (hoặc vào URL `/driver/vehicles/new`)
4. Điền form:
   - Biển số: `29A-12345`
   - Hãng: `Toyota`
   - Dòng: `Vios`
   - Năm: `2020`
   - Màu: `Trắng`
   - Số chỗ: `4`
   - Loại xe: `CAR`
   - Ngày hết hạn đăng kiểm: `2030-12-31`
   - Ngày hết hạn bảo hiểm: `2030-12-31`
5. Submit → về trang danh sách xe, status PENDING

(Nếu muốn dùng Swagger/curl thay vì UI: xem mục cũ trong git log, đã chuyển sang UI.)

### Bước E: Admin duyệt xe

**Qua Admin app (5175)**:
1. Sau khi login, vào Dashboard → tab **Vehicles** → thấy xe PENDING
2. Click **Approve** → `isVerified=true, isActive=true`

**Hoặc qua Swagger UI**: `GET /admin/vehicles/pending` → `POST /admin/vehicles/{id}/approve`

### Bước F: Driver tạo chuyến (qua Driver app UI)

Ở tab **Driver** (5174):
1. Vào `/driver` → click **🚌 Tạo chuyến mới** (hoặc URL `/driver/trips/new`)
2. Form tự load 63 tỉnh (do `/locations/provinces` là public)
3. Điền:
   - **Tỉnh đi**: Hồ Chí Minh
   - **Phường/Xã đi**: (chọn 1 ward trong HCM — dropdown phụ thuộc tỉnh)
   - **Tỉnh đến**: Hà Nội
   - **Phường/Xã đến**: (chọn 1 ward trong HN)
   - **Giờ khởi hành**: chọn ngày giờ trong tương lai (vd: ngày mai 08:00)
   - **Số ghế**: 3
   - **Giá vé/ghế**: 200000
4. Submit → redirect về `/driver`

✅ Verify: backend log có dòng `Trip created id=...`

### Bước G: Customer tìm + đặt chuyến

Ở tab **Customer** (5173):
1. Click **🔍 Tìm chuyến xe**
2. Điền:
   - Tỉnh đi: "Hồ Chí Minh"
   - Tỉnh đến: "Hà Nội"
   - Ngày: cùng ngày driver đã tạo
   - Số ghế: 1
3. Click **Tìm** → hiển thị trip
4. Click **Đặt chỗ** → form đặt → điền số ghế 1 → **Xác nhận**
5. → redirect về **📋 Chuyến của tôi**, thấy booking PENDING

### Bước H: Driver xem booking pending

**Qua Driver app (5174)**: hiện tại tab `/driver` chỉ có 2 nút tạo/xem chuyến. Quản lý booking chưa có UI — dùng Swagger UI hoặc curl:

```bash
DRIVER_TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/authentication \
  -H 'Content-Type: application/json' \
  -d '{"email":"taixe@test.com","password":"12345678"}' \
  | python -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])")

# List pending
curl -s http://localhost:8080/api/driver/bookings/pending \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  | python -c "import sys, json; d=json.load(sys.stdin)['data']; print(f'{len(d)} pending'); print(d[0])"

# Confirm booking đầu tiên
BOOKING_ID=$(curl -s http://localhost:8080/api/driver/bookings/pending \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  | python -c "import sys, json; print(json.load(sys.stdin)['data'][0]['id'])")

curl -X POST http://localhost:8080/api/driver/bookings/$BOOKING_ID/confirm \
  -H "Authorization: Bearer $DRIVER_TOKEN"
```

**Hoặc qua Swagger UI**: `GET /driver/bookings/pending` → `POST /driver/bookings/{id}/confirm`

### Bước I: Customer xác nhận

Ở tab **Customer** (5173):
1. Vào **📋 Chuyến của tôi**
2. Booking đã chuyển sang badge **✅ Đã xác nhận** (CONFIRMED)

---

## 7. Test thuật toán ranking

Sau khi tạo 2-3 trips khác nhau (giờ khác nhau, giá khác nhau), test:

### Bước 1: Tạo driver thứ 2

Qua Swagger UI (giống Bước B):
- Email: `taixe2@test.com`
- Cùng quy trình admin approve

### Bước 2: Tạo thêm trips

Driver 2 vào `/driver/trips/new`:
- Cùng tuyến HCM → HN
- Giờ khác (vd 10:00)
- Giá khác (vd 250000)
- Seat khác (vd 4)

### Bước 3: Test ranking

Qua Swagger UI `POST /api/trips/search-ranking`:
```json
{
  "from": "HCM",
  "to": "HN",
  "date": "2026-12-31",
  "seats": 1,
  "preferredTime": "08:00",
  "pickupLat": 10.7626,
  "pickupLng": 106.6602
}
```

Response: danh sách trip được **sắp xếp theo weighted score** (không phải theo giờ).

---

## 8. Troubleshooting

| Vấn đề | Nguyên nhân / Cách xửa |
|---|---|
| `Connection refused` port 8080 | Backend chưa chạy → `mvn spring-boot:run` |
| `Connection refused` Redis | `redis-server` chưa chạy → không thể login |
| Login trả 401 "Invalid email or password" | Sai email/password HOẶC hash trong DB không khớp `admin123` |
| Login trả 500 "Unable to connect to Redis" | Redis down → restart |
| 403 khi gọi admin endpoint | User không có role ADMIN → dùng account admin |
| 403 khi gọi driver endpoint | Tài khoản customer → switch sang driver app |
| 404 khi load dropdown tỉnh | Chưa seed location → xem Bước 3 |
| 500 khi upload file >5MB | FileService giới hạn 5MB |
| 500 khi upload file PNG/JPG lớn | Kiểm tra `spring.servlet.multipart.max-file-size` trong `application.yml` |
| Swagger UI 401 | Click nút **Authorize** ở góc phải, paste `Bearer <token>` |
| Token hết hạn (sau 15 phút) | Login lại lấy token mới |
| Admin app mở trắng | Chưa login → vào `/login` trước |
| Driver app redirect về `/login` khi đã login | Token hết hạn hoặc role không đúng (vd login CUSTOMER vào app driver) |

---

## 9. URL tổng hợp

| Service | URL |
|---|---|
| Backend | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/api/swagger-ui.html |
| WebSocket | ws://localhost:8080/api/ws |
| Customer web | http://localhost:5173 |
| Customer mobile (Expo) | chạy qua Expo Go, scan QR từ `npx expo start` |
| Driver app | http://localhost:5174 |
| Admin app | http://localhost:5175 |

---

## 10. Data mẫu để test nhanh

| Role | Email | Password |
|---|---|---|
| Admin | admin@rideup.com | admin123 |
| Driver 1 | taixe@test.com | 12345678 |
| Driver 2 | taixe2@test.com | 12345678 |
| Customer | khach@test.com | 12345678 |

(Driver 2 chỉ tạo khi test thuật toán ranking.)

---

## 11. Quick command (paste 1 lần)

Lưu file này vào `test.sh` (Git Bash) hoặc `test.bat` (CMD) để chạy nhanh:

**Git Bash** (`~/test.sh`):
```bash
#!/bin/bash
# Start backend (chạy background)
cd D:/OneDrive/Desktop/RideUp/rideup-backend
mvn spring-boot:run &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 30  # đợi backend boot

# Start customer
cd D:/OneDrive/Desktop/RideUp/rideup-customer
npm run dev &
CUST_PID=$!
echo "Customer PID: $CUST_PID"

# Start driver
cd D:/OneDrive/Desktop/RideUp/rideup-driver
npm run dev &
DRV_PID=$!
echo "Driver PID: $DRV_PID"

# Start admin
cd D:/OneDrive/Desktop/RideUp/rideup-admin
npm run dev &
ADM_PID=$!
echo "Admin PID: $ADM_PID"

# Wait for Ctrl+C
echo "Apps đang chạy. Ctrl+C để dừng."
wait
```

**Windows CMD** (`test.bat`):
```bat
@echo off
start "Backend"  cmd /k "cd /d D:\OneDrive\Desktop\RideUp\rideup-backend  && mvn spring-boot:run"
timeout /t 30
start "Customer" cmd /k "cd /d D:\OneDrive\Desktop\RideUp\rideup-customer && npm run dev"
start "Driver"   cmd /k "cd /d D:\OneDrive\Desktop\RideUp\rideup-driver   && npm run dev"
start "Admin"    cmd /k "cd /d D:\OneDrive\Desktop\RideUp\rideup-admin    && npm run dev"
echo All apps started.
pause
```

---

**Sau khi test xong, đọc thêm:**
- `TONG_HOP_CHUC_NANG.md` — tổng hợp toàn bộ chức năng đã build
- `CLAUDE.md` — hướng dẫn AI assistant khi đọc codebase