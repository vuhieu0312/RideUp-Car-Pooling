# RideUp Admin — Mobile (React Native + Expo)

App mobile cho admin — convert từ `rideup-admin/` (React web).

## Stack

- **Expo SDK 51** + **React Native 0.74**
- **React Native Paper** + **SegmentedButtons**
- **React Navigation** (native-stack)
- **AsyncStorage** (key riêng `adminToken` / `adminUser` để không lẫn với customer/driver)

## Cấu trúc

```
rideup-admin-mobile/
├── App.js, index.js, app.json, babel.config.js, package.json
└── src/
    ├── api/api.js           axios + JWT interceptor
    ├── auth/AuthContext.jsx dùng AsyncStorage key riêng (adminToken, adminUser)
    ├── navigation/AppNavigator.jsx
    ├── theme.js             dark slate #1e293b
    └── screens/
        ├── LoginScreen.jsx
        └── DashboardScreen.jsx   3 tab: Tài xế | Xe | Thống kê
```

## Cài đặt và chạy

```bash
cd rideup-admin-mobile
npm install
npx expo start
```

Login mặc định `admin@rideup.com` / `admin123` (đã seed trong MySQL).

## Tính năng

1. **Tài xế chờ duyệt** — list PENDING drivers với Approve / Reject
2. **Phương tiện chờ duyệt** — list PENDING vehicles
3. **Thống kê** — số tỉnh/xã trong DB

Khác biệt vs web:
- `confirm()` và `prompt()` của web thay bằng Paper `Dialog` (modal đẹp hơn, có TextInput cho lý do từ chối)
- Tab bar dùng Paper `SegmentedButtons` thay vì button tự style
- Card list view thay vì `<table>` (table không render đúng trên mobile)

## Bảo mật

- Token lưu trong AsyncStorage key riêng (`adminToken`) — không dùng chung với customer/driver
- AuthContext tự reject nếu user role không phải ADMIN

## Test

1. Backend + MySQL chạy (xem `HUONG_DAN_CHAY.md`)
2. App login admin
3. Dashboard sẽ tự load list drivers PENDING + vehicles PENDING
4. Test approve → reload → row biến mất
5. Test reject → nhập lý do trong Dialog → reload