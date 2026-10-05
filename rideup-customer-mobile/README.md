# RideUp Customer — Mobile (React Native + Expo)

App mobile cho khách hàng — convert từ `rideup-customer/` (React web) sang React Native dùng Expo + React Native Paper.

## Stack

- **Expo SDK 51** (managed workflow)
- **React Native 0.74**
- **React Native Paper** (Material Design components)
- **React Navigation** (native-stack)
- **AsyncStorage** (thay localStorage)
- **axios** (HTTP client)
- **expo-location** (lấy GPS thiết bị)

## Cấu trúc

```
rideup-customer-mobile/
├── App.js                  Root: SafeAreaProvider + PaperProvider + AuthProvider + NavigationContainer
├── index.js                Expo entry
├── app.json                Expo config + apiUrl
├── babel.config.js
├── src/
│   ├── api/api.js          axios + AsyncStorage interceptor JWT
│   ├── auth/AuthContext.jsx   Context quản lý user/token, persist storage
│   ├── navigation/AppNavigator.jsx   Auth stack | Main stack (chia theo user state)
│   ├── screens/
│   │   ├── LoginScreen.jsx
│   │   ├── RegisterScreen.jsx
│   │   ├── HomeScreen.jsx          (search + list trip)
│   │   ├── TripSearchScreen.jsx
│   │   ├── BookingCreateScreen.jsx (dùng expo-location thay Google Maps)
│   │   └── MyBookingsScreen.jsx
│   └── theme.js            MD3 theme màu xanh emerald #10b981
```

## Cài đặt và chạy

```bash
cd rideup-customer-mobile
npm install
npx expo start
```

Sau đó:
- **iOS Simulator**: scan QR qua Camera (Expo Go) hoặc nhấn `i` trong terminal
- **Android Emulator**: nhấn `a` trong terminal
- **Điện thoại thật**: cài app **Expo Go** từ App Store / Play Store, scan QR

## Cấu hình API URL

Mặc định gọi `http://localhost:8080/api`. Nếu backend chạy ở máy khác, override bằng:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.100:8080/api npx expo start
```

Hoặc sửa `app.json` → `extra.apiUrl`.

## Khác biệt so với web

| Web | Mobile |
|---|---|
| Google Maps embedded (MapPicker) | TextInput lat/lng + nút "Lấy vị trí hiện tại" qua expo-location |
| localStorage | AsyncStorage |
| react-router-dom (`<Navigate>`, `<Route>`) | @react-navigation/native-stack (`navigation.navigate('Name')`) |
| HTML `<select>`, `<input>` | Paper `TextInput` + `Menu` |
| CSS classes | StyleSheet |
| Prompt dialog khi huỷ booking | Paper `Dialog` (modal đẹp hơn) |

## Giới hạn

- **Chưa có màn hình chat** (UC32-UC36) — cần WebSocket client cho RN
- **Chưa có notification push** — cần expo-notifications + backend push service
- **File upload (multipart)** chưa có (chỉ cần cho app tài xế, không phải khách)

## Test

Sau khi backend chạy (xem `HUONG_DAN_CHAY.md`):
1. App mở → màn Login
2. Tạo account mới hoặc login `khach@test.com` / `12345678`
3. HomeScreen: chọn tỉnh/ward/ngày → Tìm chuyến ngay
4. Click "Đặt chỗ" → form đặt (dùng nút GPS để lấy vị trí)
5. Vào MyBookings xem booking mới tạo

## Lệnh hữu ích

```bash
npx expo start --clear        # Clear cache khi có lỗi Metro
npx expo install --fix          # Fix version Expo + RN khi conflict
npx expo doctor               # Kiểm tra môi trường dev
```