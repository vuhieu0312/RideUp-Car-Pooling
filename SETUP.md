$env:JAVA_HOME="D:\Program Files\Java\jdk-21.0.12.1"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
java -versionnpx expo start -c# Hướng dẫn cài đặt và chạy RideUp

RideUp gồm 1 backend (Spring Boot) và 3 app (Expo / React Native): **khách hàng**, **tài xế**, **quản trị**.
Làm lần lượt từ Bước 1 đến Bước 7. Các lệnh viết cho **Windows PowerShell** (macOS/Linux tương tự, đổi `copy` → `cp`).

```
RideUp/
├── rideup-backend/            Backend Spring Boot (cổng 8080, mọi API dưới /api)
├── rideup-customer-mobile/    App khách hàng
├── rideup-driver-mobile/      App tài xế
├── rideup-admin-mobile/       App quản trị
└── db/                        Script SQL (tạo DB, tạo admin, nâng cấp DB cũ)
```

---

## 0. Cài sẵn các công cụ

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| JDK | **21** | Kiểm tra: `java -version` |
| Maven | 3.9+ | Hoặc mở `rideup-backend` bằng IntelliJ IDEA (có sẵn Maven) |
| MySQL | **8.x** | Kèm MySQL Workbench cho dễ chạy script |
| Redis | 6+ | **Bắt buộc** – thiếu Redis thì không đăng nhập được. Cách dễ nhất trên Windows: Docker (xem Bước 2) |
| Node.js | 20 LTS trở lên | Kiểm tra: `node -v` |
| Expo Go | bản mới nhất (hỗ trợ **Expo SDK 57**) | Cài trên điện thoại từ CH Play / App Store |
| Stripe CLI | tuỳ chọn | Chỉ cần nếu test thanh toán thẻ (Bước 7) |

Máy tính và điện thoại phải **dùng chung một mạng Wi-Fi**.

---

## 1. Tạo database

Mở MySQL Workbench (hoặc `mysql -u root -p`) và chạy file `db/create_database.sql`:

```sql
CREATE DATABASE IF NOT EXISTS rideup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Không cần tạo bảng – backend tự tạo khi chạy lần đầu.

## 2. Chạy Redis

**Cách 1 – Docker (khuyên dùng):**
```powershell
docker run -d --name rideup-redis -p 6379:6379 --restart unless-stopped redis:7
```
**Cách 2 – Không có Docker:** cài [Memurai](https://www.memurai.com/) (Redis cho Windows) hoặc Redis trong WSL, để cổng mặc định `6379`.

Kiểm tra: `docker exec -it rideup-redis redis-cli ping` → trả `PONG`.

## 3. Cấu hình backend

```powershell
cd rideup-backend\src\main\resources
copy application-local.example.yml application-local.yml
```

Mở `application-local.yml` và sửa tối thiểu:

| Khoá | Điền gì |
|---|---|
| `spring.datasource.username` / `password` | Tài khoản MySQL của bạn |
| `app.jwt.secret` | Chuỗi bí mật **≥ 32 ký tự** (thiếu là backend không khởi động) |
| `stripe.*` | Khoá Stripe **test mode** – bỏ qua nếu chỉ test thanh toán tiền mặt |

`application-local.yml` đã nằm trong `.gitignore`, **không commit** file này.

## 4. Chạy backend

```powershell
cd rideup-backend
mvn spring-boot:run
```

- Thấy dòng `Started RideUpApplication` là xong. Swagger: <http://localhost:8080/api/swagger-ui.html>
- **Lần chạy đầu tiên** backend tự tải danh sách tỉnh/thành và phường/xã Việt Nam từ OpenStreetMap → **cần Internet và mất vài phút**. Các lần sau không tải lại.
  Nếu máy không có mạng: chạy với `$env:LOCATION_SEED_ENABLED="false"; mvn spring-boot:run` (khi đó sẽ không có dữ liệu tỉnh/phường để tạo chuyến).
- **Mở tường lửa cho cổng 8080** để điện thoại gọi được vào máy (PowerShell chạy *Run as Administrator*):
  ```powershell
  New-NetFirewallRule -DisplayName "RideUp backend 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow
  ```

## 5. Tạo tài khoản quản trị

Hệ thống không có màn đăng ký admin. Sau khi backend đã chạy ít nhất 1 lần, chạy file `db/create-admin.sql`.
Tài khoản tạo ra: **admin@rideup.vn / Admin@123**.

## 6. Chạy các app mobile

Làm giống nhau cho từng app (mở mỗi app một cửa sổ terminal riêng):

```powershell
cd rideup-customer-mobile        # hoặc rideup-driver-mobile / rideup-admin-mobile
copy .env.example .env
npm install
npx expo start -c
```

Sửa `.env` trước khi chạy:
- `EXPO_PUBLIC_API_URL=http://<IP-máy-tính>:8080/api` – xem IP bằng `ipconfig` (dòng **IPv4 Address** của Wi-Fi), ví dụ `http://192.168.1.10:8080/api`.
- App khách thêm `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` (cùng tài khoản Stripe với backend).

Sau khi `expo start` chạy:
- **Điện thoại:** mở Expo Go → quét mã QR trong terminal.
- **Trình duyệt:** bấm `w` (web tự dùng `localhost:8080`, không cần sửa IP). Lưu ý: thanh toán thẻ **không** chạy trên web.
- Đổi `.env` thì phải dừng và chạy lại `npx expo start -c`.
- Nhiều app cùng lúc: Expo sẽ hỏi dùng cổng khác (8082, 8083…) → bấm `Y`.

## 7. (Tuỳ chọn) Test thanh toán thẻ Stripe

```powershell
stripe login
stripe listen --forward-to localhost:8080/api/payments/webhook
```
Copy chuỗi `whsec_...` in ra → dán vào `stripe.webhook-secret` trong `application-local.yml` → khởi động lại backend.
Thẻ test: `4242 4242 4242 4242`, ngày hết hạn bất kỳ trong tương lai, CVC bất kỳ.

---

## Chạy thử luồng chính

1. **App tài xế** → Đăng ký tài xế (điền thông tin + chụp 3 ảnh CCCD/GPLX).
2. **App quản trị** (admin@rideup.vn) → tab *Tài xế* → **Duyệt**.
3. **App tài xế** tự vào màn chính → Tài khoản → **Đăng ký xe**.
4. **App quản trị** → tab *Xe* → **Duyệt**.
5. **App tài xế** → **Tạo chuyến mới**: chọn tỉnh đi/đến **và chọn khu vực đón, khu vực trả** (chuyến không có khu vực đón/trả sẽ không tìm thấy được).
6. **App khách** → đăng ký → tìm chuyến (đúng tỉnh + phường đã chọn ở bước 5, đúng ngày) → đặt chỗ **Tiền mặt**.
7. **App tài xế** → booking hiện ngay ở tab *Chờ duyệt* → **Duyệt**. Khách thấy trạng thái đổi ngay (realtime).
8. Tài xế **Bắt đầu** (được phép từ 30 phút trước giờ đi) → **Kết thúc** → khách **đánh giá**.

---

## Đã có database từ phiên bản cũ?

`ddl-auto: update` không tự xoá/sửa cột cũ. Nếu DB của bạn tạo từ code cũ, **tắt backend** rồi chạy các script trong `db/` theo thứ tự (lỗi "đã tồn tại / không tồn tại" ở script nào thì bỏ qua script đó):

1. `migrate-booking-status.sql`
2. `fix-enum-columns.sql`
3. `drop-booking-active-constraint.sql`
4. `fix-ward-code.sql`, `insert-missing-wards.sql`
5. `add-indexes.sql`
6. `drop-dead-columns.sql`
7. `drop-redundant-columns.sql`
8. `fix-cash-pending-bookings.sql`

Sau đó chạy lại backend. Muốn làm sạch hoàn toàn: `DROP DATABASE rideup;` rồi làm lại từ Bước 1.

---

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| App điện thoại báo *Network Error* / quay mãi | Sai IP trong `.env`, điện thoại khác Wi-Fi, hoặc tường lửa chặn cổng 8080 (xem Bước 4). Thử mở `http://<IP>:8080/api/locations/provinces` bằng trình duyệt điện thoại. |
| Backend báo `JWT secret must be at least 32 bytes` | `app.jwt.secret` quá ngắn. |
| Backend báo `Could not resolve placeholder 'app.jwt...'` | Chưa tạo `application-local.yml` (Bước 3). |
| `Unable to connect to Redis` / đăng nhập luôn lỗi 401 | Redis chưa chạy (Bước 2). |
| `Communications link failure` | MySQL chưa chạy hoặc sai user/mật khẩu. |
| `Port 8080 was already in use` | Tắt tiến trình đang chiếm cổng: `netstat -ano \| findstr :8080` rồi `taskkill /PID <pid> /F`. |
| Lần đầu chạy backend rất lâu / lỗi Overpass timeout | Đang tải dữ liệu tỉnh/phường, đợi hoặc chạy lại (có tự thử lại). |
| `Unknown column ...` hoặc `Field 'payment_status' doesn't have a default value` | DB cũ – chạy các script ở mục *Đã có database từ phiên bản cũ?*. |
| Không tìm thấy chuyến vừa tạo | Chuyến phải còn mở, đúng ngày, và có khu vực đón/trả trùng phường khách chọn. |
| App không tự cập nhật (phải kéo để tải lại) | Xem log Expo: phải có `[RT ...] CONNECTED`. Log backend phải có `[RT] handshake OK` và `[RT] SUBSCRIBE`. |
| Expo báo lỗi lạ sau khi kéo code mới | `npm install` lại rồi `npx expo start -c` (xoá cache). |
| Thanh toán thẻ báo không hỗ trợ | Đang chạy trên web – thẻ chỉ dùng trên điện thoại. |
