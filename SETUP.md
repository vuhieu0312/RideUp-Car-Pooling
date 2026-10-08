# RideUp — Hướng dẫn chạy dự án

Dự án gồm 3 module: **Backend Spring Boot** + **2 mobile app Expo** (customer + driver). Tài liệu này hướng dẫn cài đặt và chạy từ đầu.

---

## 1. Yêu cầu hệ thống

| Phần mềm | Phiên bản | Ghi chú |
|---|---|---|
| **JDK** | 21 | Backend compile |
| **Maven** | 3.x | Build backend |
| **Node.js** | 18.x trở lên | Chạy Expo |
| **npm** | 9.x trở lên | Có sẵn khi cài Node |
| **MySQL** | 8.x | Database backend |
| **Redis** | 6.x trở lên | Token storage cho JWT |
| **Expo CLI** | mới nhất | `npm i -g expo` (tùy chọn, có thể dùng `npx`) |

Kiểm tra nhanh:
```bash
java -version    # → 21.x
mvn -v           # → Apache Maven 3.x
node -v          # → v18.x hoặc 20.x
mysql --version  # → 8.x
redis-cli -v     # → 6.x hoặc 7.x
```

---

## 2. Khởi động Database (MySQL + Redis)

### 2.1. MySQL

```bash
# Đăng nhập MySQL
mysql -u root -p

# Tạo database
CREATE DATABASE rideup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Tạo user (tùy chọn - hoặc dùng root)
CREATE USER 'rideup'@'localhost' IDENTIFIED BY 'rideup';
GRANT ALL PRIVILEGES ON rideup.* TO 'rideup'@'localhost';
FLUSH PRIVILEGES;
```

> Backend mặc định đọc từ biến môi trường. Có thể bỏ qua nếu dùng `root/root` và `localhost:3306`.

Backend tự generate schema qua Hibernate `ddl-auto: update` — không cần chạy SQL thủ công.

### 2.2. Redis

```bash
# Windows (qua WSL hoặc Memurai/Redis cho Windows)
redis-server

# macOS
brew services start redis

# Linux
sudo systemctl start redis
```

Verify:
```bash
redis-cli ping    # → PONG
```

---

## 3. Chạy Backend (Spring Boot)

```bash
cd rideup-backend
mvn clean package -DskipTests
mvn spring-boot:run
```

Hoặc chạy trực tiếp từ IDE: mở `RideUpApplication.java` → Run.

### Cấu hình môi trường (tùy chọn)

Mặc định backend dùng `localhost:3306` (MySQL user `root/root`) và `localhost:6379` (Redis). Nếu khác, set biến môi trường:

```bash
# Windows (PowerShell)
$env:DB_URL="jdbc:mysql://localhost:3306/rideup?useSSL=false&serverTimezone=UTC"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="root"
$env:REDIS_HOST="localhost"
$env:REDIS_PORT="6379"
$env:JWT_SECRET="<32-ký-tự-bất-kỳ-trở-lên>"

# macOS/Linux (bash)
export DB_URL="jdbc:mysql://localhost:3306/rideup?useSSL=false&serverTimezone=UTC"
export DB_USERNAME="root"
export DB_PASSWORD="root"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export JWT_SECRET="<32-ký-tự-bất-kỳ-trở-lên>"
```

### Verify backend

```bash
# Swagger UI
open http://localhost:8080/api/swagger-ui.html

# Health check (nếu có actuator)
curl http://localhost:8080/api/actuator/health
```

Backend chạy ở **port 8080**, context path **`/api`** (ví dụ endpoint: `http://localhost:8080/api/auth/authentication`).

---

## 4. Chạy Customer Mobile

```bash
cd rideup-customer-mobile
npm install
npx expo start
```

Sau khi Metro bundle xong, bấm:
- `w` — mở trên web browser (nhanh nhất để test)
- `a` — Android emulator
- `i` — iOS simulator (chỉ trên macOS)
- Hoặc quét QR bằng Expo Go trên điện thoại thật

### Cấu hình API URL

Mặc định `api.js` dùng `http://localhost:8080/api`. Khi test trên **điện thoại thật**, cần trỏ về IP máy tính:

```bash
# Windows
set EXPO_PUBLIC_API_URL=http://192.168.1.10:8080/api
npx expo start

# macOS/Linux
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080/api npx expo start
```

Thay `192.168.1.10` bằng IP thực của máy chạy backend (`ipconfig` trên Windows, `ifconfig` trên macOS/Linux).

> ⚠️ Nếu test trên web browser, `localhost` đã đúng — không cần đổi.

---

## 5. Chạy Driver Mobile

```bash
cd rideup-driver-mobile
npm install
npx expo start
```

Giống customer: bấm `w` / `a` / `i` hoặc quét QR. Cùng biến `EXPO_PUBLIC_API_URL` nếu test trên thiết bị thật.

> Driver cần được admin duyệt mới vào được MainTabs. Mới đăng ký sẽ ở màn `DriverStatusScreen` (chờ duyệt / bị từ chối / đang chạy...).

---

## 6. Test account mẫu

Sau khi tạo qua app, bạn có thể:

| Role | Cách tạo | Đăng nhập |
|---|---|---|
| **Customer** | Mở app customer → Tab "Đăng ký" (nếu có) hoặc `POST /auth/register` với `role: CUSTOMER` | Tab "Tài khoản" → Đăng nhập |
| **Driver** | Mở app driver → Tab "Đăng ký tài xế" (cần upload CCCD, GPLX) | Sau khi admin duyệt, mới login được vào MainTabs |
| **Admin** | Tạo trực tiếp trong DB: `INSERT INTO app_user_role (user_id, role) VALUES ('<userId>', 'ADMIN');` | Login vào web admin (chưa có mobile admin app) |

Đăng ký nhanh qua API (Postman/curl):
```bash
# Customer
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Nguyễn Văn A",
    "email": "customer@test.com",
    "phone": "0901234567",
    "password": "123456",
    "role": "CUSTOMER"
  }'

# Driver (multipart - cần upload 3 ảnh CCCD front/back + GPLX)
curl -X POST http://localhost:8080/api/driver/register \
  -F "fullName=Trần Văn B" \
  -F "email=driver@test.com" \
  -F "password=123456" \
  -F "phone=0901234568" \
  -F "cccd=012345678901" \
  -F "gplx=B2-12345" \
  -F "gplxExpiryDate=2030-12-31" \
  -F "cccdImageFront=@/path/to/cccd-front.jpg" \
  -F "cccdImageBack=@/path/to/cccd-back.jpg" \
  -F "gplxImage=@/path/to/gplx.jpg"
```

---

## 7. Cấu trúc thư mục

```
RideUp/
├── rideup-backend/          # Spring Boot
│   ├── src/main/java/com/rideup/
│   │   ├── controller/       # REST endpoints
│   │   ├── service/          # Business logic
│   │   ├── repository/       # JPA
│   │   ├── entity/           # DB models
│   │   ├── dto/              # request/response
│   │   └── security/         # JWT, Spring Security
│   └── src/main/resources/
│       ├── application.yml   # Cấu hình chính
│       └── application-local.yml
│
├── rideup-customer-mobile/   # Expo app cho khách
│   ├── App.js
│   ├── src/
│   │   ├── auth/             # AuthContext
│   │   ├── api/              # Axios client
│   │   ├── components/       # Shared UI
│   │   ├── screens/          # Từng màn hình
│   │   ├── navigation/       # React Navigation
│   │   └── theme.js          # Colors, font, typography
│   └── package.json
│
├── rideup-driver-mobile/     # Expo app cho tài xế
│   └── (cùng cấu trúc customer)
│
├── db/
│   ├── create_database.sql   # Tạo DB
│   └── _backup/V1__init.sql  # Schema tham khảo (Hibernate tự generate)
│
├── docs/
├── CLAUDE.md                # Hướng dẫn cho AI assistant
├── SETUP.md                 # File này
└── do_an_v0.5 (2).docx      # Đặc tả dự án (tiếng Việt)
```

---

## 8. Troubleshooting các lỗi thường gặp

### ❌ Backend không start — `Communications link failure`
- MySQL chưa chạy hoặc sai user/password. Check `db.create_database.sql` và biến môi trường `DB_*`.

### ❌ Backend không start — `Redis connection refused`
- Redis chưa chạy. Khởi động Redis server (xem mục 2.2).

### ❌ Metro `500 Internal Server Error` + `MIME type 'application/json'`
- Cache Metro cũ. Fix:
  ```bash
  cd rideup-customer-mobile  # hoặc rideup-driver-mobile
  rm -rf node_modules/.cache .expo
  npx expo start -c
  ```

### ❌ Tab Chrome hiển thị "undefined"
- `document.title` chưa được set khi app start. Fix đã có sẵn trong `App.js`:
  ```js
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.title = 'RideUp';
  }
  ```
- Nếu vẫn lỗi, hard reload: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac).

### ❌ Font chữ trông khác nhau giữa 2 app / các màn
- File `Text.defaultProps` chưa được apply. Kiểm tra `App.js`:
  ```js
  if (Text && !Text.defaultProps?.style?.fontFamily) {
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = { fontFamily: FONT[400] };
  }
  ```
- Nếu Text dùng style inline `{ fontSize: 14, fontWeight: '700' }` mà KHÔNG có `fontFamily`, browser sẽ fake-bold bằng system font. **Fix:** thêm `fontFamily: FONT[700]` (hoặc 600/800 tuỳ weight) vào style.

### ❌ Warning `"shadow" style props are deprecated. Use "boxShadow".`
- File còn dùng iOS-style shadow (`shadowColor/Offset/Opacity/Radius`) mà không có `boxShadow` long-form. Dùng helper `shadow()` từ theme:
  ```js
  import { shadow } from '../theme';
  card: { ...shadow(8, 0.12, 24) }   // y, opacity, blur
  ```
  Helper tự thêm cả `shadowColor/Offset/Opacity/Radius/elevation` (native) lẫn `boxShadow` (web).

### ❌ Login từ mobile không được — 401
- Sai `EXPO_PUBLIC_API_URL`. Mobile cần trỏ đúng IP máy chạy backend, không phải `localhost` (trừ khi test trên web).
- Backend chưa chạy. Verify: `curl http://localhost:8080/api/auth/authentication -X POST ...`

### ❌ Mở tab Tài khoản bị giật về Home
- `useEffect` trong `AccountScreen` gọi `updateUser()` ngay khi mount → re-render toàn app → React Navigation reset tab. Fix: chỉ `setProfile(data)` cục bộ, KHÔNG gọi `updateUser` ở useEffect. `updateUser` chỉ gọi sau khi upload avatar hoặc lưu edit.

### ❌ Mất ảnh hero (background xe)
- Unsplash URL bị rate-limit. Có thể đổi URL khác, hoặc tải ảnh về `assets/images/hero.jpg` rồi dùng `require('../assets/images/hero.jpg')`.

### ❌ `Uncaught ReferenceError: FONT is not defined` (driver)
- File dùng `fontFamily: FONT[800]` mà import chỉ có `colors`. Thêm `FONT`:
  ```js
  import { colors, FONT } from '../theme';
  ```

---

## 9. Lệnh nhanh

```bash
# === Backend ===
cd rideup-backend
mvn spring-boot:run

# === Customer mobile ===
cd rideup-customer-mobile
npx expo start -c                # -c = clear cache

# === Driver mobile ===
cd rideup-driver-mobile
npx expo start -c

# === Reset everything ===
# 1. Drop & recreate DB
mysql -u root -p -e "DROP DATABASE rideup; CREATE DATABASE rideup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# 2. Clear cache cả 2 mobile
rm -rf */node_modules/.cache */.expo
# 3. Restart Redis
redis-cli FLUSHALL
```

---

## 10. Liên hệ / Issue

Bug hoặc câu hỏi, ghi vào file `docs/` hoặc tạo issue trong repo.
