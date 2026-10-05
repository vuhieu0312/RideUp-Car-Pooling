# RideUp Driver — Mobile (React Native + Expo)

App mobile cho tài xế — convert từ `rideup-driver/` (React web).

## Stack

- **Expo SDK 51** + **React Native 0.74**
- **React Native Paper** (Material Design)
- **React Navigation** (native-stack)
- **expo-image-picker** — chụp/chọn ảnh CCCD/GPLX khi đăng ký
- **expo-location** — GPS thiết bị
- **AsyncStorage** — token + user persistence

## Cấu trúc

```
rideup-driver-mobile/
├── App.js, index.js, app.json, babel.config.js, package.json
└── src/
    ├── api/api.js, auth/AuthContext.jsx, theme.js
    ├── navigation/AppNavigator.jsx
    └── screens/
        ├── LoginScreen.jsx
        ├── DriverRegisterScreen.jsx   (multipart upload 3 ảnh)
        ├── DriverStatusScreen.jsx    (poll mỗi 10s)
        ├── HomeScreen.jsx            (stats + bottom nav)
        ├── AllTripsScreen.jsx        (filter theo trạng thái)
        ├── TripCreateScreen.jsx      (form đầy đủ)
        ├── VehicleRegisterScreen.jsx
        └── VehicleListScreen.jsx
```

## Cài đặt và chạy

```bash
cd rideup-driver-mobile
npm install
npx expo start
```

## Quyền runtime (iOS/Android)

App sẽ xin quyền khi cần:
- **Camera**: chụp ảnh CCCD/GPLX
- **Photo Library**: chọn ảnh từ thư viện
- **Location**: lấy GPS (chưa dùng trong flow hiện tại, nhưng khai báo sẵn)

## Khác biệt so với web

| Web | Mobile |
|---|---|
| 3 ô input file riêng (`<input type="file">`) | `expo-image-picker` → camera + library, preview ảnh |
| Tự build MobileDatePicker / TimePicker | Dùng TextInput date/time ISO đơn giản |
| `react-router-dom` | `@react-navigation/native-stack` |
| localStorage | AsyncStorage |
| CSS class | StyleSheet + Theme配色 |
| MobileBottomNav với 5 tab | 4-tab Home / AllTrips / TripCreate / VehicleList |

## Test

1. Backend + MySQL/Redis chạy (xem `HUONG_DAN_CHAY.md`)
2. App login với `taixe@test.com` / `12345678` (đã approved sẵn)
3. Tạo chuyến thử nghiệm
4. Upload ảnh CCCD/GPLX khi đăng ký tài xế mới

## Lưu ý

- **`DriverStatusScreen` poll 10s** — chỉ hiển thị khi status != APPROVED. Sau khi admin duyệt → tự navigate sang HomeScreen.
- **`DriverRegisterScreen`** tự login sau khi đăng ký (backend trả token), AppNavigator chuyển sang Main stack. Trạng thái PENDING → poll screen.
- **Multipart upload** RN dùng FormData với `{uri, name, type}` từ `expo-image-picker` (khác với web Blob). Backend Spring nhận multipart vẫn OK.