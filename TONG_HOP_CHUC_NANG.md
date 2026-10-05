# Tổng hợp chức năng RideUp — Cập nhật 2026-10-05

---

## 1. Tổng quan hệ thống

```
RideUp/
├── rideup-backend/                Spring Boot 3.3 + Java 21 + Maven
│   ├── src/main/java/com/rideup/ (114 file .java)
│   │   ├── common/               ApiResponse, AppException, ErrorCode, GlobalExceptionHandler
│   │   ├── config/               RedisConfig, WebMvcConfig, RestTemplateConfig, WebSocketConfig
│   │   ├── constant/             RedisKey, RedisKeyTTL
│   │   ├── controller/           11 controllers (xem §3)
│   │   ├── dto/
│   │   │   ├── request/          13 DTO
│   │   │   └── response/         13 DTO
│   │   ├── entity/               17 JPA entities
│   │   ├── enums/                14 enums
│   │   ├── repository/           17 Spring Data repositories
│   │   ├── security/             JWT filter, JWT service, Security config, WebSocket auth
│   │   └── service/              10 services (xem §3)
│   └── src/main/resources/
│       ├── application.yml       Config chính (commission + stripe config mới)
│       ├── application-local.yml Config dev (MySQL local + Redis local)
│       └── static/ws-test.html   Test page WebSocket (debug only)
│
├── rideup-customer/              React + Vite (port 5173)
│   └── src/pages/                Login, Register, Home, TripSearch, BookingCreate, MyBookings
│
├── rideup-driver/                React + Vite (port 5174 — cần config)
│   └── src/pages/                Login, Register, Status, Home, AllTrips, TripCreate,
│                                 VehicleList, VehicleRegister
│
├── rideup-admin/                 React + Vite (port 5175)
│   └── src/pages/                Login, Dashboard (duyệt driver + thống kê)
│
├── docs/                         (empty)
├── db/
│   ├── create_database.sql       Tạo database `rideup`
│   └── _backup/V1__init.sql      Schema reference (không tự chạy — ddl-auto=update)
│
├── do_an_v0.5 (2).docx           Tài liệu tham khảo
├── thuat-toan-ranking-tim-chuyen.md   Ghi chú thuật toán ranking
├── TONG_HOP_CHUC_NANG.md         File này
├── HUONG_DAN_CHAY.md             Hướng dẫn chạy backend
└── CLAUDE.md                     Project guide cho AI assistant
```

---

## 2. Tech stack đã dùng

| Layer | Công nghệ |
|---|---|
| Backend | Spring Boot 3.3.5, Java 21, Spring Security 6, Spring Data JPA, Spring WebSocket (STOMP), Lombok |
| Database | MySQL 8 (Hibernate `ddl-auto: update`) |
| Cache/Token | Redis 7 (Lettuce client) |
| Auth | JWT (HS256/HS512 tự động theo key size), BCrypt |
| File upload | Local disk `uploads/` + serve qua `/uploads/**` |
| HTTP client | Spring `RestTemplate` (cho Overpass API) |
| Geodata | OpenStreetMap Overpass API |
| Frontend | React 18 + Vite 5, axios, React Router 6 (plain CSS) |
| Build | Maven 3.x; `mvn clean package` ra `target/rideup-backend-0.0.1-SNAPSHOT.jar` |

---

## 3. Chức năng đã build (theo luồng nghiệp vụ)

### 3.1. Module Auth — Xác thực & Phân quyền

**File liên quan:**
- `entity/User.java`, `entity/RefreshToken.java`
- `service/AuthenticationService.java`
- `controller/AuthController.java`
- `security/JwtService.java`, `security/JwtAuthFilter.java`, `security/SecurityConfig.java`

**Endpoints:**
| Method | URL | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Đăng ký CUSTOMER (hardcode role CUSTOMER) |
| POST | `/api/auth/authentication` | Public | Login → trả JWT access + refresh |
| POST | `/api/auth/refresh-token` | Public | Refresh access token |
| POST | `/api/auth/logout` | Authenticated | Revoke refresh token + xóa Redis |

**Luồng đăng ký:**
```
1. Client POST /api/auth/register {fullName, email, phone, password}
2. AuthenticationService:
   - Check email/phone chưa tồn tại
   - BCrypt hash password
   - Tạo User với roles = {CUSTOMER}
3. Response 200 + AuthResponse {accessToken, refreshToken, userInfo}
```

**Luồng login:**
```
1. Client POST /api/auth/authentication {email, password}
2. AuthenticationService:
   - Tìm user theo email
   - BCrypt match password
   - Lưu userRoles từ DB
   - JwtService.generateAccessToken(userId, roles) — HS256/HS512, TTL 15 phút
   - Tạo refreshToken UUID, hash SHA-256, lưu DB + Redis (TTL 30 ngày)
3. Response AuthResponse {accessToken, refreshToken, userInfo.roles, expiresIn}
4. Redis: SET auth:access:<jwt> = userId, TTL 15 phút
   → JwtAuthFilter check Redis trên mỗi request — nếu không có = token revoked
```

**Phân quyền theo role:**
- CUSTOMER: tìm chuyến, đặt vé, huỷ vé, review
- DRIVER: đăng ký xe, tạo chuyến, xác nhận booking (phải APPROVED)
- ADMIN: duyệt tài xế/xe, xem thống kê

→ Phân quyền **2 lớp**:
- **URL-level**: `@PreAuthorize("hasRole('...')")` trên controller method
- **Domain-level**: check ownership trong service (vd: chỉ owner mới confirm booking)

---

### 3.2. Module Driver KYC — Đăng ký hồ sơ tài xế

**File liên quan:**
- `entity/DriverProfile.java`
- `service/DriverService.java`, `service/FileService.java`
- `controller/DriverController.java`

**Endpoint:**
| Method | URL | Quyền | Mô tả |
|---|---|---|---|
| POST | `/api/driver/register` | Public | Đăng ký KYC (multipart với 3 file ảnh) |
| GET | `/api/driver/me` | DRIVER | Xem profile của mình |
| GET | `/api/driver/status` | DRIVER | Chỉ status + message (poll) |

**Luồng đăng ký tài xế:**
```
1. Driver app POST /api/driver/register (multipart/form-data):
   - Fields: fullName, email, password, phone, cccd, gplx, gplxExpiryDate
   - Files: cccdImageFront, cccdImageBack, gplxImage (JPEG/PNG/WebP, ≤5MB)
2. DriverService.register():
   a. Check email/phone chưa tồn tại
   b. Check CCCD/GPLX chưa được đăng ký bởi driver khác
   c. FileService.upload() × 3 → lưu vào /uploads/cccd-front-{uuid}.jpg, ...
   d. Trong 1 @Transactional:
      - Tạo User với roles = {DRIVER}
      - Tạo DriverProfile với status = PENDING
      - Lưu 3 URL ảnh vào entity
3. Response AuthResponse {accessToken, userInfo.driver = {status: "PENDING", ...}}
→ Driver vào app thấy trang "Đang chờ duyệt"
→ Polling /api/driver/status mỗi 10s
```

**FileService (upload):**
- Validate content-type (JPEG/PNG/WebP), size ≤5MB
- Tạo UUID filename: `cccd-front-{uuid}.jpg`
- Lưu vào `rideup-backend/uploads/` (config qua `app.upload.dir`)
- Trả relative URL `/uploads/cccd-front-{uuid}.jpg`
- Serve qua `WebMvcConfig.addResourceHandlers("/uploads/**" → file:...)`

---

### 3.3. Module Admin — Duyệt hồ sơ & xe

**File liên quan:**
- `service/AdminService.java`, `service/VehicleService.java`
- `controller/AdminController.java`

**Endpoints:**
| Method | URL | Quyền |
|---|---|---|
| GET | `/api/admin/drivers?status=PENDING\|APPROVED\|REJECTED` | ADMIN |
| POST | `/api/admin/drivers/{id}/approve` | ADMIN |
| POST | `/api/admin/drivers/{id}/reject?reason=...` | ADMIN |
| GET | `/api/admin/vehicles/pending` | ADMIN |
| POST | `/api/admin/vehicles/{id}/approve` | ADMIN |
| POST | `/api/admin/vehicles/{id}/reject?reason=...` | ADMIN |

**Luồng duyệt driver:**
```
1. Admin login → token có role ADMIN
2. GET /admin/drivers?status=PENDING → list DriverProfile có status=PENDING
3. POST /api/admin/drivers/{id}/approve:
   - @PreAuthorize check hasRole('ADMIN')
   - AdminService.approve():
     * Set status=APPROVED, approvedAt=now, approvedBy=adminUserId
     * Clear rejected fields
     * Save (1 query UPDATE)
4. POST /api/admin/drivers/{id}/reject?reason=...:
   - Set status=REJECTED, rejectedAt=now, rejectionReason
```

⚠️ **Lưu ý tránh bug**: KHÔNG gọi `driverProfile.setUser(approver)` — approver là admin, không phải driver.

**Luồng duyệt xe:** tương tự — set `isVerified=true, isActive=true` sau khi approved.

---

### 3.4. Module Vehicle — Đăng ký xe

**File liên quan:**
- `entity/Vehicle.java`, `repository/VehicleRepository.java`
- `service/VehicleService.java`, `controller/VehicleController.java`

**Endpoints (DRIVER role):**
| Method | URL | Mô tả |
|---|---|---|
| POST | `/api/driver/vehicles` | Đăng ký xe mới |
| GET | `/api/driver/vehicles` | List xe của driver hiện tại |

**Luồng đăng ký xe:**
```
1. Driver đã APPROVED → POST /api/driver/vehicles
   {
     "plateNumber": "29A-12345",
     "vehicleBrand": "Toyota", "vehicleModel": "Vios",
     "vehicleYear": 2020, "vehicleColor": "Trắng",
     "seatCapacity": 4, "vehicleType": "CAR",
     "registrationExpiryDate": "2026-12-31",
     "insuranceExpiryDate": "2026-12-31"
   }
2. VehicleService.registerVehicle():
   - requireApprovedDriver(userId) → 403 nếu chưa APPROVED
   - Check plateNumber chưa tồn tại (unique)
   - Mỗi driver chỉ 1 xe (1-1 với DriverProfile)
   - Tạo Vehicle với isVerified=false, isActive=false
3. Vehicle lưu ở trạng thái PENDING (chờ admin duyệt)
```

---

### 3.5. Module Trip — Tạo + Tìm chuyến

**File liên quan:**
- `entity/Trip.java`, `entity/Province.java`, `entity/Ward.java`, `entity/TripStop.java`
- `service/TripService.java`, `service/LocationService.java`
- `controller/TripController.java`, `controller/LocationController.java`
- `controller/LocationAdminController.java`, `service/LocationDataSeeder.java`

**Endpoints Driver:**
| Method | URL | Quyền |
|---|---|---|
| POST | `/api/trips` | DRIVER (APPROVED + có xe verified) |
| GET | `/api/trips/mine` | DRIVER |

**Endpoints Customer:**
| Method | URL | Quyền |
|---|---|---|
| GET | `/api/trips/search?from=&to=&date=&seats=` | CUSTOMER |
| POST | `/api/trips/search-ranking` | CUSTOMER |

**Luồng tạo chuyến:**
```
1. Driver đã APPROVED + có xe verified:
   POST /api/trips {
     "startProvinceId": "...",   // ID từ /locations/provinces
     "endProvinceId": "...",
     "startWardId": "...",        // optional, validate thuộc startProvinceId
     "endWardId": "...",
     "pickupLat": 10.7626,        // optional, dùng cho ranking Haversine
     "pickupLng": 106.6602,
     "departureTime": "2026-12-31T08:00:00",
     "estimatedArrivalTime": "...",
     "seatTotal": 3,              // phải ≤ vehicle.seatCapacity
     "priceVnd": 200000,
     "note": "..."
   }
2. TripService.createTrip():
   - requireApprovedDriver() → 403 nếu chưa
   - requireVerifiedVehicle() → 403 nếu xe chưa duyệt
   - Validate seatTotal ≤ vehicle.seatCapacity
   - Validate wardId thuộc đúng provinceId
   - @Transactional: tạo Trip với status=OPEN, seatAvailable=seatTotal
3. Response TripResponse đầy đủ
```

**Luồng tìm chuyến — 2 thuật toán:**

#### A. `GET /trips/search` — Sort đơn giản
```
1. Parse from, to (province code), date, seats
2. tripRepository.searchTrips(status=OPEN, from, to, date, date+1day, seats)
3. ORDER BY departure_time ASC
→ Trả danh sách trip có status=OPEN, đủ ghế, sort theo giờ sớm nhất
```

#### B. `POST /trips/search-ranking` — Weighted Sum Model
```
1. FILTER (giống A) → tập candidates
2. Batch fetch rating của tất cả driver trong 1 query (tránh N+1)
3. Min-max normalize giá/rating, tính điểm từng trip:
   score = 0.35·timeScore + 0.30·priceScore + 0.20·ratingScore + 0.15·distScore
   - timeScore  = 1 - |tripTime - preferredTime| / 12h
   - priceScore = 1 - (price - minPrice) / (maxPrice - minPrice)
   - ratingScore = driverRating / maxRating
   - distScore = 1 - Haversine(userPos, trip.pickupLat/Lng) / 50km
4. ORDER BY score DESC
→ Trả trips tốt nhất trước (theo giờ + giá + rating + khoảng cách)
```

---

### 3.6. Module Location — Tỉnh/Xã từ OpenStreetMap

**File liên quan:**
- `service/LocationDataSeeder.java`, `service/LocationService.java`
- `controller/LocationAdminController.java`, `controller/LocationController.java`

**Endpoints (public):**
| Method | URL |
|---|---|
| GET | `/api/locations/provinces?keyword=HCM` |
| GET | `/api/locations/provinces/{id}` |
| GET | `/api/locations/wards?provinceId=X&keyword=Quan1` |
| GET | `/api/locations/wards/{id}` |

**Endpoints admin:**
| Method | URL |
|---|---|
| POST | `/api/admin/locations/seed` |
| GET | `/api/admin/locations/stats` |

**Luồng seed dữ liệu (manual trigger):**
```
1. Admin: POST /api/admin/locations/seed
2. LocationDataSeeder.seedAll():
   - Nếu province table rỗng → gọi Overpass API:
     * Query: area["ISO3166-1"="VN"] → rel admin_level=4 → out tags center
     * Lưu 63 tỉnh vào DB (name, code từ ISO3166-2, lat/lng từ center)
   - Với mỗi tỉnh:
     * Sleep 2s (rate-limit)
     * Query Overpass: relation admin_level=8 (ward) trong province → fallback 6
     * Lưu ~3,300 phường/xã
   - Fallback 3 server Overpass: overpass-api.de, kumi.systems, openstreetmap.ru
   - Retry 3 lần với exponential backoff + jitter (200-700ms)
3. Response SeedResult {provinceCount, wardCount}
```

**Idempotent**: chạy nhiều lần OK — check `findByOsmid` trước khi save.

---

### 3.7. Module Booking — Đặt vé (chia 2 phía Customer/Driver)

**File liên quan:**
- `entity/Booking.java`, `entity/Payment.java`, `entity/Refund.java`
- `service/BookingService.java`
- `controller/BookingCustomerController.java`, `controller/BookingDriverController.java`

**Endpoints Customer (CUSTOMER role):**
| Method | URL | Mô tả |
|---|---|---|
| POST | `/api/customer/bookings` | Đặt chỗ |
| GET | `/api/customer/bookings/mine` | List booking của tôi |
| DELETE | `/api/customer/bookings/{id}?reason=...` | Huỷ booking |

**Endpoints Driver (DRIVER role):**
| Method | URL | Mô tả |
|---|---|---|
| GET | `/api/driver/bookings` | List tất cả booking của chuyến tôi |
| GET | `/api/driver/bookings/pending` | List booking chờ duyệt |
| POST | `/api/driver/bookings/{id}/confirm` | Duyệt booking |
| POST | `/api/driver/bookings/{id}/reject?reason=...` | Từ chối booking |

**Luồng đặt vé (UC24 — phiên bản thu gọn):**
```
1. Customer POST /api/customer/bookings:
   {
     "tripId": "...",
     "seatCount": 2,
     "pickupAddressText": "...",   // optional
     "pickupLat": ..., "pickupLng": ...,
     "dropoffAddressText": "...",
     "dropoffLat": ..., "dropoffLng": ...,
     "note": "..."
   }
2. BookingService.createBooking() (có retry loop 3 lần):
   a. Tìm customer
   b. Tìm trip (status phải OPEN hoặc FULL)
   c. Check customer != trip.driver
   d. Check duplicate booking PENDING/CONFIRMED (DB unique constraint backup)
   e. TripService.reserveSeat() — Optimistic Locking (@Version) + retry
   f. Tạo Booking: status=PENDING, paymentStatus=PENDING
      bookingCode = "BK-XXXXXXXX" (8 ký tự random)
      totalAmount = pricePerSeat × seatCount
      reservedAt=now, expiresAt=now+2h
   g. @Transactional (REQUIRES_NEW) — tất cả 1 transaction, retry trên ObjectOptimisticLockingFailureException
3. Response BookingResponse {bookingCode, status="PENDING", totalAmount, expiresAt}
```

**Luồng driver xác nhận:**
```
1. Driver GET /api/driver/bookings/pending → list PENDING
3. POST /api/driver/bookings/{id}/confirm:
   - @PreAuthorize DRIVER
   - Check booking.trip.driver == currentDriver (ownership)
   - Check booking.status == PENDING
   - Set status=CONFIRMED
4. POST /api/driver/bookings/{id}/reject?reason=...:
   - Set status=CANCELLED_USER, cancelledAt=now, cancelReason=...
   - TripService.releaseSeat() — tăng seatAvailable + mở trip nếu FULL→OPEN
```

**Luồng customer huỷ:**
```
1. Customer DELETE /api/customer/bookings/{id}?reason=...:
   - Check booking.customer == currentUser
   - Check status PENDING/CONFIRMED (chưa COMPLETED/CANCELLED_USER)
   - Set status=CANCELLED_USER, cancelledAt, cancelReason
   - TripService.releaseSeat()
```

⚠️ **Spec yêu cầu nhưng em chưa có:**
- `paymentMethod` (CASH/STRIPE) enum **đã có** trong DB schema, **chưa** gắn vào booking request → `Booking` chưa chọn được CASH/STRIPE lúc tạo
- Endpoint `POST /api/customer/bookings/{id}/pay` chưa có (chưa có PaymentService)
- Endpoint `POST /api/driver/trips/{id}/start` + `/complete` chưa có → driver chưa chuyển TripStatus OPEN→STARTED→COMPLETED
- BookingExpireScheduler chưa có (booking PENDING có expiresAt mà không auto-huỷ)

---

### 3.8. Module Review — Đánh giá tài xế (UC37)

**File liên quan:**
- `entity/Review.java`
- `service/ReviewService.java`
- `controller/ReviewCustomerController.java`, `controller/ReviewQueryController.java`

**Endpoints:**
| Method | URL | Quyền |
|---|---|---|
| POST | `/api/customer/reviews/{tripId}` | CUSTOMER |
| GET | `/api/reviews/drivers/{driverId}` | Public |

**Luồng review:**
```
1. Customer POST /api/customer/reviews/{tripId}:
   {
     "rating": 5,        // 1-5
     "comment": "..."     // optional
   }
2. ReviewService.createReview():
   a. Validate trip.status == COMPLETED  ← hiện chưa COMPLETED được (chưa có endpoint)
   b. Validate customer đã booking trip này (status PENDING/CONFIRMED/COMPLETED)
   c. Validate chưa review trip này (existsByTripIdAndCustomerId)
   d. Tạo Review record
   e. Cập nhật DriverProfile:
      newAvg = (oldAvg × count + newRating) / (count + 1)
      totalDriverRides++
3. Response ReviewResponse
```

---

### 3.9. Frontend — 3 app riêng biệt

#### `rideup-customer/` (port 5173)

**Pages:**
- `LoginPage` — login (chỉ CUSTOMER role)
- `RegisterCustomerPage` — đăng ký
- `CustomerHomePage` — trang chính + nút "Tìm chuyến" + "Chuyến của tôi"
- `TripSearchPage` — search với dropdown tỉnh/ngày + hiển thị kết quả
- `BookingCreatePage` — form đặt (số ghế + pickup/dropoff GPS + tổng tiền)
- `MyBookingsPage` — list booking + badge status + nút huỷ

**Routing (App.jsx):**
```
/                → HomeRedirect → /home (nếu CUSTOMER) hoặc /login
/login          → LoginPage
/register       → RegisterCustomerPage
/home           → CustomerHomePage (RequireCustomer)
/customer/search      → TripSearchPage
/customer/book        → BookingCreatePage (state trip từ search page)
/customer/bookings    → MyBookingsPage
```

#### `rideup-driver/` (cần config port khác, vd 5174)

**Pages:**
- `LoginPage` — login (DRIVER hoặc ADMIN only — reject CUSTOMER)
- `DriverRegisterPage` — form KYC với 3 upload file ảnh
- `DriverStatusPage` — poll status mỗi 10s, redirect khi APPROVED
- `DriverHomePage` — sau APPROVED, navigation dạng bottom-nav
- `TripCreatePage` — form tạo trip với cascading dropdown (tỉnh → phường)
- `AllTripsPage` — danh sách tất cả trip của tôi
- `VehicleRegisterPage` — form đăng ký xe (upload ảnh đăng kiểm/bảo hiểm)
- `VehicleListPage` — list xe của tôi (chờ duyệt / đã duyệt)

**Routing chính:**
```
/                              → HomeRedirect theo role
/login                         → LoginPage
/register                      → DriverRegisterPage
/driver                        → DriverHomePage (RequireRole DRIVER)
/driver/pending                → DriverStatusPage (chờ duyệt)
/driver/trips/new              → TripCreatePage
/driver/trips                  → AllTripsPage
/driver/vehicles               → VehicleListPage
/driver/vehicles/new           → VehicleRegisterPage
```

#### `rideup-admin/` (port 5175)

**Pages:**
- `LoginPage` — login ADMIN
- `DashboardPage` — duyệt driver + duyệt vehicle + thống kê tổng quan
- `Navbar` — brand "RideUp - Admin"

**Routing chính:**
```
/login      → LoginPage
/dashboard  → DashboardPage (RequireAdmin)
*           → redirect theo trạng thái đăng nhập
```

---

## 4. Tính năng CÒN THIẾU (theo spec)

| Use Case | Trạng thái | Ghi chú |
|---|---|---|
| UC02 Email verification | ❌ | Cần JavaMailSender + SMTP |
| UC06/UC07 OTP reset password | ❌ | Cần email |
| UC08/UC09 Profile/Avatar | ❌ | User entity có avatar_url nhưng chưa có endpoint upload |
| UC11/UC12 Update/Delete driver profile | ❌ | Mới có register + approve/reject |
| UC14 Delete vehicle | ❌ | |
| UC17/UC18 Approve/Reject vehicle (UI) | ✅ | rideup-admin DashboardPage đã có |
| UC20 Trip detail (driver) | ⚠️ Partial | Có list mine, chưa có detail |
| UC22 Change trip status (start/complete/cancel) | ❌ | Cần `POST /driver/trips/{id}/start` + `/complete` |
| UC25 Booking detail | ❌ | |
| UC27 Driver list bookings by trip | ✅ | Có `/api/driver/bookings` |
| UC29 Complete trip (driver marks booking COMPLETED) | ❌ | |
| **UC30 Stripe payment** | ❌ | Đồ án chỉ làm CASH, schema đã có PaymentMethod enum |
| **UC30b CASH payment flow** | ⚠️ Partial | Schema đủ nhưng chưa có PaymentService |
| **UC30c Commission 10% + refund** | ❌ | Chưa triển khai |
| UC31 Payment info | ❌ | |
| UC32-UC36 Chat realtime | ❌ | WS infrastructure có, chưa có @MessageMapping |
| UC38 View driver reviews | ✅ | Có `/api/reviews/drivers/{driverId}` |
| UC39/UC40 Notification | ❌ | Entity có, chưa có service + cron |
| UC41 Report (báo cáo vi phạm) | ❌ | |
| Admin dashboard UI | ✅ | rideup-admin DashboardPage |

---

## 5. Schema ER (đã có 17 tables)

```
app_user                ✓ Auth register/login
app_user_role           ✓ (User.roles Set<Role>)
driver_profile          ✓ Driver KYC + approve
vehicle                 ✓ Vehicle register + approve
refresh_token           ✓ JWT refresh
province                ✓ Location seeder
ward                    ✓ Location seeder
trip                    ✓ Trip create/search + ranking
trip_stop               ✓ Entity có, hỗ trợ cascading dropdown UI
booking                 ✓ Đặt vé + confirm/reject/cancel
payment                 ✓ Entity có, CHƯA có controller/service
refund                  ✓ Entity có, CHƯA có controller/service
conversation              ✓ Entity có, CHƯA có ChatController
conversation_member     ✓ Entity có, CHƯA có
message                 ✓ Entity có, CHƯA có
call_session            ✓ Entity có, CHƯA có
notification            ✓ Entity có, CHƯA có service/cron
review                  ✓ Review API + DriverRating recalc
```

---

## 6. Kiến trúc phân lớp

```
┌──────────────────────────────────────────┐
│       HTTP Request (Postman/Frontend)     │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│  Security Filter Chain                     │
│  → CorsFilter → JwtAuthFilter →           │
│  → ExceptionTranslationFilter →           │
│  → AuthorizationFilter (@PreAuthorize)     │
└──────────────────┬───────────────────────┘
                   ↓ (JWT verified, principal set)
┌──────────────────────────────────────────┐
│  Controller (@RestController)             │
│  → Validate request (Bean Validation)      │
│  → Call Service                            │
│  → Wrap response in ApiResponse            │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│  Service (@Service, @Transactional)        │
│  → Business logic                          │
│  → Domain validation                       │
│  → Authorization check (requireApproved…)  │
│  → Coordinate other services               │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│  Repository (Spring Data JPA)              │
│  → Hibernate ORM                           │
│  → Optimistic locking (@Version)            │
│  → Transaction managed by @Transactional  │
└──────────────────┬───────────────────────┘
                   ↓
┌──────────────────────────────────────────┐
│  MySQL + Redis                             │
│  MySQL: persistent data                    │
│  Redis: JWT whitelist, refresh tokens      │
└──────────────────────────────────────────┘
```

---

## 7. Cách chạy

### Yêu cầu
- Java 21, Maven 3.x
- Node.js 20+ (cho frontend)
- MySQL 8 chạy ở `localhost:3306`, DB `rideup`, user `root`/`root`
- Redis 7 chạy ở `localhost:6379`

### Backend
```bash
cd rideup-backend
mvn spring-boot:run
# → chạy ở http://localhost:8080/api
# → Swagger UI: http://localhost:8080/api/swagger-ui.html
# → WebSocket: ws://localhost:8080/api/ws
```

### Frontend
```bash
# Customer
cd rideup-customer
npm install && npm run dev
# → http://localhost:5173

# Driver (cần config port khác — vd 5174)
cd rideup-driver
npm install && npm run dev
# → http://localhost:5174

# Admin (cần config port khác — vd 5175)
cd rideup-admin
npm install && npm run dev
# → http://localhost:5175
```

### Seed location (1 lần)
```bash
# Login admin trước
curl -X POST http://localhost:8080/api/auth/authentication \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@rideup.com","password":"admin123"}'
# → lấy accessToken

# Seed (chờ 5-10 phút)
curl -X POST http://localhost:8080/api/admin/locations/seed \
  -H "Authorization: Bearer <token>"
# → 63 tỉnh, ~3,300 phường/xã
```

---

## 8. Bootstrap admin

Chạy 1 lần SQL để tạo admin đầu tiên:
```sql
SELECT UUID() INTO @admin_id;

INSERT INTO app_user (id, full_name, phone, email, password, verified, created_at, updated_at)
VALUES (@admin_id, 'Admin', '0900000000', 'admin@rideup.com',
        '<bcrypt hash của admin123>', 1, NOW(), NOW());

INSERT INTO user_roles (user_id, role) VALUES (@admin_id, 'ADMIN');
```

Generate bcrypt hash tại https://bcrypt-generator.com (rounds=10) — paste password `admin123` → lấy hash.

---

## 9. Số liệu thống kê

- **Backend**: 114 source files .java
- **17 entities** + 17 repositories + 13 DTO request + 13 DTO response
- **14 enums**
- **11 controllers** (Auth, Admin, Driver, Vehicle, Trip, Location, LocationAdmin, BookingCustomer, BookingDriver, ReviewCustomer, ReviewQuery)
- **10 services** (Auth, Driver, Vehicle, Trip, Booking, Review, LocationDataSeeder, LocationService, Admin, FileService)
- **3 frontend apps** riêng biệt (Customer port 5173, Driver port 5174, Admin port 5175)
- **1 thuật toán ranking** (Weighted Sum với Haversine)

---

## 10. Kế hoạch tiếp theo (ưu tiên)

| # | Task | Độ khó | Giá trị |
|---|---|---|---|
| 1 | PaymentService + chọn CASH/STRIPE lúc tạo booking | Trung bình | Hoàn thiện luồng thanh toán |
| 2 | Auto-expire booking PENDING (cron) | Dễ | Tránh khoá ghế vĩnh viễn |
| 3 | Endpoint `POST /driver/trips/{id}/start` + `/complete` | Dễ | Để test review E2E |
| 4 | Commission split + refund rules (khi nào hoàn 100%, 50%, không hoàn) | Trung bình | Theo yêu cầu giáo viên |
| 5 | Idempotency Key cho POST /bookings | Trung bình | Tránh duplicate booking |
| 6 | NotificationService + endpoint + cron (nhắc chuyến, nhắc commission) | Trung bình | |
| 7 | Report (customer/driver báo cáo vi phạm) | Trung bình | Theo yêu cầu giáo viên |
| 8 | Chat realtime (UC33) — dùng WS infrastructure có sẵn | Khó | Tận dụng WebSocket |
| 9 | Email verification + OTP (UC02/06/07) | Khó | Cần SMTP config |

---

## 11. Ghi chú kỹ thuật

- **Optimistic locking**: `@Version` trên Trip + Booking → Spring tự retry nếu conflict (concurrency booking). BookingService có retry loop 3 lần với jitter 10-40ms.
- **N+1 query fix** (ranking): batch fetch rating 1 lần thay vì query mỗi trip
- **Bỏ hard-code toạ độ**: Haversine dùng `trip.pickupLat/Lng` thật
- **Idempotent seeder**: check osmId đã tồn tại → skip
- **JWT secret ≥ 32 bytes**: enforced trong `JwtService.@PostConstruct`
- **Redis chứa 2 thứ**: access token (15 phút TTL) + refresh token hash (30 ngày TTL)
- **Public endpoint** `/locations/**` cho phép frontend load dropdown KHÔNG cần JWT
- **Role phân quyền 2 lớp**: URL-level (`@PreAuthorize`) + domain-level (service check ownership)
- **WebSocket infrastructure sẵn** (chỉ dùng cho chat sau): STOMP broker + JWT handshake + Principal set
- **DB constraint backup**: Booking có `uniqueConstraint (customer_id, trip_id, status)` để bảo vệ tuyệt đối cuối cùng nếu logic check ở service bị bypass
- **Frontend 3 app tách biệt**: customer/driver/admin — share component pattern (Navbar, MapPicker) nhưng riêng routing/credentials. Admin dùng localStorage key `adminUser` riêng.

---

**Tài liệu tham khảo:**
- `do_an_v0.5 (2).docx` — tài liệu tham khảo
- `thuat-toan-ranking-tim-chuyen.md` — ghi chú thuật toán ranking
- `HUONG_DAN_CHAY.md` — hướng dẫn chạy backend chi tiết
- `CLAUDE.md` — project guide cho AI assistant