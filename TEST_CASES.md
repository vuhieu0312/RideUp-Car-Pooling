# Test case thủ công cho RideUp (test trên giao diện)

Cách dùng: làm lần lượt từng nhóm, đánh dấu `☑` khi đạt, `☒` khi lỗi và ghi chú vào cột cuối. Nhóm nào cần dữ liệu từ nhóm trước thì có ghi "tiên quyết".

## 0. Chuẩn bị

### Tài khoản và dữ liệu
| Mã | Nội dung |
|---|---|
| ADMIN | `admin@rideup.vn / Admin@123` (chạy `db/create-admin.sql` sau lần chạy backend đầu) |
| TX-A | Tài xế đã được admin duyệt, có 1 xe đã duyệt (từ 4 chỗ trở lên) |
| TX-B | Tài xế mới đăng ký, chưa duyệt |
| KH-1, KH-2 | 2 khách hàng khác nhau |
| Dữ liệu | Đã seed tỉnh/phường (kiểm tra `GET /admin/locations/stats` ra `{provinces, wards}` > 0) |

### Dịch vụ phải chạy
MySQL, Redis, MongoDB (cho chat), backend, 3 app (customer, driver, admin). Stripe dùng khóa **test**.

### Thẻ test Stripe
| Thẻ | Kết quả |
|---|---|
| `4242 4242 4242 4242` | Thanh toán thành công |
| `4000 0000 0000 0002` | Bị từ chối (declined) |
| `4000 0000 0000 9995` | Từ chối vì không đủ tiền |
| `4000 0025 0000 3155` | Yêu cầu xác thực 3D Secure |
Hạn dùng: bất kỳ ngày tương lai. CVC: bất kỳ 3 số.

### Biến môi trường để test các mốc thời gian (đặt trước khi chạy backend)
| Biến | Giá trị test | Dùng cho |
|---|---|---|
| `BOOKING_PENDING_MINUTES` | `1` | Hết hạn thanh toán (mục 13) |
| `TRIP_NO_SHOW_CANCEL_MINUTES` | `1` | Tự hủy chuyến tài xế không bấm bắt đầu (mục 14) |
| `BOOKING_EXPIRATION_CHECK_MS` | `10000` | Quét nhanh hơn |
| `app.booking.waiting-approval-expiration-hours` (trong yml) | `0` hoặc số nhỏ | Hết hạn chờ duyệt (mục 13) |

Sau khi test xong nhớ trả các giá trị về mặc định.

---

## 1. Đăng ký, đăng nhập, đăng xuất (app khách hàng)

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| AUTH-01 | Mở app lần đầu, chưa đăng nhập | Hiện màn Đăng nhập | ☐ | |
| AUTH-02 | Đăng ký đủ họ tên, email, SĐT, mật khẩu hợp lệ | Tạo tài khoản, vào thẳng màn chính | ☐ | |
| AUTH-03 | Đăng ký email đã tồn tại | Báo lỗi trùng email, không tạo thêm | ☐ | |
| AUTH-04 | Đăng ký bỏ trống từng trường | Báo lỗi đúng trường, không gửi lên server | ☐ | |
| AUTH-05 | Đăng ký email sai định dạng | Báo lỗi định dạng email | ☐ | |
| AUTH-06 | Đăng ký mật khẩu quá ngắn | Báo lỗi theo quy tắc mật khẩu | ☐ | |
| AUTH-07 | Đăng nhập đúng | Vào màn chính, hiện đúng tên | ☐ | |
| AUTH-08 | Đăng nhập sai mật khẩu | Báo "Sai thông tin đăng nhập", không vào được | ☐ | |
| AUTH-09 | Đăng nhập email không tồn tại | Cùng thông báo như AUTH-08 (không lộ email có tồn tại hay không) | ☐ | |
| AUTH-10 | Đăng nhập bằng tài khoản **tài xế** vào app khách | Bị từ chối "Sai thông tin đăng nhập" | ☐ | |
| AUTH-11 | Đăng nhập bằng tài khoản **admin** vào app khách | Bị từ chối | ☐ | |
| AUTH-12 | Đăng nhập xong, tắt hẳn app, mở lại | Vẫn đăng nhập (khôi phục phiên) | ☐ | |
| AUTH-13 | Đăng xuất | Về màn Đăng nhập, mở lại app không còn phiên | ☐ | |
| AUTH-14 | Đăng xuất rồi bấm Back của hệ điều hành | Không quay lại được màn đã đăng nhập | ☐ | |
| AUTH-15 | Đăng nhập cùng tài khoản trên 2 máy | Cả 2 dùng bình thường | ☐ | |

## 2. Đăng nhập app tài xế và app admin

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| AUTH-20 | Tài xế đã duyệt đăng nhập app tài xế | Vào màn chính (tab Trang chủ, Chuyến xe, Tin nhắn, Thông báo, Tài khoản) | ☐ | |
| AUTH-21 | Tài xế **chưa duyệt** (TX-B) đăng nhập | Thấy màn trạng thái hồ sơ, không vào được các tab chính | ☐ | |
| AUTH-22 | Khách hàng đăng nhập vào app tài xế | Bị từ chối | ☐ | |
| AUTH-23 | Admin đăng nhập app admin | Vào Dashboard | ☐ | |
| AUTH-24 | Khách hàng / tài xế đăng nhập app admin | Bị từ chối | ☐ | |
| AUTH-25 | Sai mật khẩu ở cả 3 app | Báo lỗi, không vào | ☐ | |
| AUTH-26 | Đăng xuất ở từng app | Về màn Đăng nhập | ☐ | |

## 3. Hồ sơ tài khoản (khách và tài xế)

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| PRO-01 | Mở tab Tài khoản | Hiện đúng họ tên, email, SĐT | ☐ | |
| PRO-02 | Sửa họ tên, SĐT, ngày sinh, giới tính rồi lưu | Lưu thành công, tab Tài khoản và Trang chủ cập nhật ngay | ☐ | |
| PRO-03 | Sửa SĐT sai định dạng | Báo lỗi, không lưu | ☐ | |
| PRO-04 | Chọn ngày sinh ở tương lai | Không cho chọn | ☐ | |
| PRO-05 | Bỏ trống họ tên khi lưu | Báo lỗi | ☐ | |
| PRO-06 | Không có ô sửa email | Email không sửa được | ☐ | |
| PRO-07 | Đổi ảnh đại diện (chọn ảnh từ máy) | Ảnh mới hiện ở Tài khoản và ở góc phải Trang chủ | ☐ | |
| PRO-08 | Đổi ảnh có dung lượng lớn (> 5MB) | Báo lỗi rõ ràng, không crash | ☐ | |
| PRO-09 | Đổi mật khẩu đúng mật khẩu cũ | Thành công; đăng xuất, đăng nhập lại bằng mật khẩu mới được | ☐ | |
| PRO-10 | Đổi mật khẩu sai mật khẩu cũ | Báo lỗi, không đổi | ☐ | |
| PRO-11 | Mật khẩu mới ngắn hoặc không khớp xác nhận | Báo lỗi | ☐ | |
| PRO-12 | Sau khi đổi ảnh ở app khách, mở app tài xế xem người đó | (nếu có hiển thị) ảnh hiển thị đúng, không lỗi tải | ☐ | |
| PRO-13 | Mở lại tab Tài khoản sau khi quay về từ màn sửa | Dữ liệu mới, không giật về Trang chủ | ☐ | |

## 4. Đăng ký tài xế và admin duyệt

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| DRV-01 | Mở màn đăng ký tài xế, nhập đủ thông tin, ảnh CCCD, ảnh GPLX | Gửi thành công, chuyển sang màn trạng thái "Chờ duyệt" | ☐ | |
| DRV-02 | Bỏ trống ảnh CCCD hoặc GPLX | Báo lỗi, không gửi | ☐ | |
| DRV-03 | Đăng ký với email đã có | Báo lỗi trùng, không upload thừa file | ☐ | |
| DRV-04 | Ảnh quá lớn | Báo lỗi rõ ràng | ☐ | |
| DRV-05 | Admin mở Dashboard | Thấy hồ sơ TX-B trong danh sách chờ duyệt | ☐ | |
| DRV-06 | Admin mở chi tiết hồ sơ | Thấy đủ thông tin và ảnh CCCD, GPLX | ☐ | |
| DRV-07 | Admin **từ chối** có nhập lý do | Hồ sơ rời danh sách chờ; app tài xế hiện trạng thái từ chối kèm lý do (không cần tải lại) | ☐ | |
| DRV-08 | Admin từ chối bỏ trống lý do | Báo lỗi (hoặc theo đúng quy định hệ thống) | ☐ | |
| DRV-09 | Admin **duyệt** hồ sơ | App tài xế tự chuyển sang màn chính, không cần đăng nhập lại | ☐ | |
| DRV-10 | Mail duyệt/từ chối (nếu bật `MAIL_ENABLED=true`) | Tài xế nhận mail tương ứng; nếu tắt thì chỉ có log | ☐ | |
| DRV-11 | Tài xế đã duyệt thử tạo chuyến khi **chưa có xe được duyệt** | Báo cần có xe đã duyệt | ☐ | |

## 5. Quản lý xe (tài xế)

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| VEH-01 | Đăng ký xe đủ thông tin (biển số, số chỗ, ảnh...) | Xe ở trạng thái chờ duyệt | ☐ | |
| VEH-02 | Đăng ký xe trùng biển số | Báo lỗi | ☐ | |
| VEH-03 | Đăng ký khi đã có xe (1 tài xế = 1 xe) | Chặn hoặc báo rõ ràng | ☐ | |
| VEH-04 | Số chỗ = 0 hoặc quá lớn | Báo lỗi | ☐ | |
| VEH-05 | Admin duyệt xe | Xe thành "Đã duyệt", app tài xế cập nhật | ☐ | |
| VEH-06 | Admin từ chối xe | Hiện lý do từ chối ở app tài xế | ☐ | |
| VEH-07 | Danh sách xe | Hiện đúng thông tin và trạng thái | ☐ | |

## 6. Tạo chuyến (tài xế)

Tiên quyết: đăng nhập TX-A.

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| TRIP-01 | Mở màn tạo chuyến | Xe được **tự chọn** nếu tài xế chỉ có 1 xe | ☐ | |
| TRIP-02 | Chọn tỉnh đi, tỉnh đến, giờ khởi hành tương lai, số ghế, giá, ghi chú rồi tạo | Tạo thành công, chuyến xuất hiện ở danh sách "Chuyến xe" trạng thái OPEN | ☐ | |
| TRIP-03 | Chọn giờ khởi hành trong quá khứ | Báo lỗi | ☐ | |
| TRIP-04 | Số ghế lớn hơn số chỗ của xe | Báo "vượt quá sức chứa" | ☐ | |
| TRIP-05 | Số ghế 0 hoặc âm | Báo lỗi | ☐ | |
| TRIP-06 | Giá bằng 0 hoặc âm | Báo lỗi | ☐ | |
| TRIP-07 | Tỉnh đi trùng tỉnh đến | Báo lỗi (hoặc theo quy định của hệ thống) | ☐ | |
| TRIP-08 | Thêm điểm đón (phường ở tỉnh đi) và điểm trả (phường ở tỉnh đến) | Tạo được, hiện đúng phường ở danh sách | ☐ | |
| TRIP-09 | Chọn phường điểm đón **không thuộc** tỉnh đi | Không chọn được, hoặc báo lỗi | ☐ | |
| TRIP-10 | Tạo chuyến không thêm điểm dừng nào | Tạo được; kiểm tra TRIP/SEARCH-05 xem có tìm thấy | ☐ | |
| TRIP-11 | Ghi chú quá 1000 ký tự | Bị giới hạn hoặc báo lỗi | ☐ | |
| TRIP-12 | Tài xế chưa có xe được duyệt cố tạo chuyến | Bị chặn, báo rõ lý do | ☐ | |

## 7. Quản lý chuyến (tài xế)

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| MT-01 | Mở tab Chuyến xe | Thấy danh sách chuyến, mới nhất trước, đúng trạng thái và số ghế | ☐ | |
| MT-02 | Bấm vào chuyến | Mở danh sách booking của riêng chuyến đó | ☐ | |
| MT-03 | Chuyến không có booking | Hiện trạng thái rỗng, không lỗi | ☐ | |
| MT-04 | Hủy chuyến OPEN không có booking | Chuyến sang CANCELED, biến mất khỏi kết quả tìm kiếm | ☐ | |
| MT-05 | Hủy chuyến không nhập lý do | Hệ thống ghi "Không rõ" hoặc yêu cầu nhập (theo thiết kế), không lỗi | ☐ | |
| MT-06 | Bấm **Bắt đầu** trước giờ đi hơn 30 phút | Báo "Chưa đến giờ khởi hành" | ☐ | |
| MT-07 | Bấm **Bắt đầu** trong khoảng 30 phút trước giờ đi | Chuyến sang STARTED | ☐ | |
| MT-08 | Bấm **Kết thúc** khi chuyến chưa STARTED | Không có nút hoặc báo lỗi | ☐ | |
| MT-09 | Bấm **Kết thúc** chuyến STARTED | Chuyến sang COMPLETED; số chuyến đã chạy của tài xế tăng 1 | ☐ | |
| MT-10 | Chuyến COMPLETED hoặc CANCELED | Không còn nút hủy, bắt đầu, kết thúc | ☐ | |
| MT-11 | Mất kết nối khi bấm bắt đầu/kết thúc | Báo lỗi rõ ràng, trạng thái không đổi sai | ☐ | |
| MT-12 | Số ghế trên danh sách | Giảm khi duyệt booking, tăng lại khi booking đã duyệt bị hủy | ☐ | |

## 8. Tìm chuyến (khách hàng)

Tiên quyết: có ít nhất vài chuyến OPEN (có điểm dừng và không điểm dừng) trong ngày hôm nay và ngày mai.

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| SEARCH-01 | Chọn tỉnh đi, tỉnh đến, ngày hôm nay, tìm | Hiện các chuyến OPEN đúng tuyến, có giờ đi từ bây giờ trở đi | ☐ | |
| SEARCH-02 | Tìm ngày mai | Hiện chuyến của ngày mai, sắp theo giờ đi | ☐ | |
| SEARCH-03 | Tìm ngày trong quá khứ | Không cho chọn hoặc báo lỗi | ☐ | |
| SEARCH-04 | **Chỉ chọn tỉnh**, để ô xã/phường là "Tất cả khu vực" | Ra tất cả chuyến trên tuyến 2 tỉnh đó | ☐ | |
| SEARCH-05 | Chỉ chọn tỉnh, chuyến không có điểm dừng nào | Chuyến đó vẫn xuất hiện | ☐ | |
| SEARCH-06 | Chọn thêm phường đón cụ thể | Chỉ còn chuyến có điểm đón đúng phường đó | ☐ | |
| SEARCH-07 | Chọn thêm phường trả cụ thể | Chỉ còn chuyến có điểm trả đúng phường đó | ☐ | |
| SEARCH-08 | Chọn cả 2 phường | Lọc theo cả đón và trả | ☐ | |
| SEARCH-09 | Đổi tỉnh đi sau khi đã chọn phường | Phường cũ bị reset, không giữ phường không thuộc tỉnh mới | ☐ | |
| SEARCH-10 | Tìm tuyến không có chuyến | Hiện thông báo không có kết quả, không lỗi | ☐ | |
| SEARCH-11 | Chuyến FULL, CANCELED, STARTED, COMPLETED | Không xuất hiện trong kết quả | ☐ | |
| SEARCH-12 | Chuyến đã quá giờ khởi hành nhưng chưa bị hủy | Không xuất hiện (với ngày hôm nay) | ☐ | |
| SEARCH-13 | Thông tin trên thẻ chuyến | Đúng giờ đi, giá, số ghế còn, tên tài xế, điểm đón/trả | ☐ | |
| SEARCH-14 | Trong lúc xem kết quả, tài xế duyệt booking làm chuyến FULL | Kết quả có thể chưa tự cập nhật; kéo/tìm lại phải ra đúng (ghi nhận hành vi hiện tại) | ☐ | |
| SEARCH-15 | Tìm lại ngay sau khi tài xế tạo chuyến mới | Chuyến mới hiện trong kết quả | ☐ | |

## 9. Đặt chỗ bằng tiền mặt (CASH)

Tiên quyết: có chuyến OPEN còn ít nhất 3 ghế, đăng nhập KH-1.

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| BK-01 | Từ kết quả tìm kiếm, bấm đặt chỗ | Mở màn đặt chỗ, hiện đúng tuyến, giờ, giá | ☐ | |
| BK-02 | Chọn số ghế 1, chọn điểm đón và điểm trả (tìm địa chỉ hoặc ghim bản đồ), phương thức CASH, đặt | Tạo thành công, chuyển sang tab "Chuyến xe của tôi", booking ở trạng thái **chờ tài xế duyệt** | ☐ | |
| BK-03 | Tổng tiền | Bằng giá chuyến x số ghế, tính đúng | ☐ | |
| BK-04 | Chọn số ghế 3 | Tổng tiền gấp 3 lần | ☐ | |
| BK-05 | Chọn số ghế vượt số ghế còn | Báo lỗi hoặc không cho chọn | ☐ | |
| BK-06 | Bỏ trống điểm đón hoặc điểm trả | Báo lỗi bắt buộc | ☐ | |
| BK-07 | Điểm đón/trả đã chọn sẵn từ tìm kiếm | Ô phường bị khóa (chỉ đọc), không đổi được | ☐ | |
| BK-08 | Tìm theo tỉnh (không chọn phường) rồi đặt | Có thể chọn phường điểm đón, phường điểm trả trong tỉnh đó | ☐ | |
| BK-09 | Đặt chuyến thứ 2 cho cùng chuyến khi đã có booking đang hoạt động | Báo lỗi (mỗi khách 1 booking hoạt động cho 1 chuyến) | ☐ | |
| BK-10 | Hủy booking rồi đặt lại cùng chuyến | Đặt lại được | ☐ | |
| BK-11 | Tài xế của chuyến thấy booking mới ngay (không cần kéo tải lại) | Hiện ở danh sách "chờ duyệt" | ☐ | |
| BK-12 | Ghi chú cho tài xế | Tài xế thấy ghi chú | ☐ | |
| BK-13 | Mở bản đồ ở thẻ booking của tài xế | Hiện đúng điểm đón, điểm trả khách ghim | ☐ | |
| BK-14 | Khách đặt chuyến đã hủy hoặc đã bắt đầu (qua màn cũ chưa tải lại) | Báo "Chuyến không còn nhận đặt chỗ" | ☐ | |

## 10. Đặt chỗ và thanh toán Stripe

Tiên quyết: chạy trên điện thoại hoặc giả lập (web không thanh toán Stripe được).

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| PAY-01 | Đặt chỗ phương thức STRIPE | Hiện PaymentSheet ngay sau khi đặt | ☐ | |
| PAY-02 | Thanh toán bằng thẻ `4242...` | Booking chuyển sang chờ tài xế duyệt, trạng thái thanh toán "Đã đặt cọc" (giữ tiền) | ☐ | |
| PAY-03 | Thẻ `4000 0000 0000 0002` | Báo thanh toán lỗi; booking vẫn ở "chờ thanh toán" và có nút **Thanh toán ngay** | ☐ | |
| PAY-04 | Thẻ `4000 0000 0000 9995` | Báo không đủ tiền; có thể thử lại | ☐ | |
| PAY-05 | Thẻ 3D Secure `4000 0025 0000 3155` | Hiện xác thực; hoàn thành thì thành công, hủy xác thực thì không bị trừ tiền | ☐ | |
| PAY-06 | Đóng PaymentSheet giữa chừng | Không báo lỗi; booking vẫn "chờ thanh toán", bấm "Thanh toán ngay" thanh toán lại được | ☐ | |
| PAY-07 | Thanh toán ngay từ nút ở tab Chuyến xe | Dùng lại đúng PaymentIntent cũ, không tạo thêm | ☐ | |
| PAY-08 | Số tiền trên PaymentSheet | Khớp tổng tiền booking (VND), không sửa được từ app | ☐ | |
| PAY-09 | Trên Stripe Dashboard (test) | Có PaymentIntent trạng thái **requires_capture** (đang giữ tiền), chưa trừ thật | ☐ | |
| PAY-10 | Thanh toán thành công nhưng tắt app ngay lập tức | Mở lại: booking vẫn sang trạng thái đã thanh toán (nhờ webhook nếu có `stripe listen`) hoặc còn "chờ thanh toán" để bấm lại | ☐ | |
| PAY-11 | Thanh toán 2 lần liên tiếp bấm nhanh | Chỉ 1 lần trừ/giữ tiền | ☐ | |
| PAY-12 | Trên web | Báo không hỗ trợ thanh toán Stripe trên web, không crash | ☐ | |
| PAY-13 | Webhook (`stripe listen --forward-to localhost:8080/api/payments/webhook`) | Gửi sự kiện thì trạng thái đồng bộ; gửi cùng sự kiện 2 lần không xử lý lặp | ☐ | |
| PAY-14 | Gửi webhook giả (curl) khi **chưa** cấu hình secret | Bị từ chối (400) | ☐ | |
| PAY-15 | Gửi webhook giả có chữ ký sai khi đã cấu hình secret | Bị từ chối | ☐ | |

## 11. Tài xế duyệt và từ chối booking

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| CF-01 | Tài xế mở tab Chuyến xe, tab chờ duyệt | Thấy booking CASH và STRIPE (đã giữ tiền) đang chờ | ☐ | |
| CF-02 | Booking STRIPE chưa thanh toán (chờ thanh toán) | Không xuất hiện ở nhóm chờ duyệt để duyệt | ☐ | |
| CF-03 | Duyệt booking | Booking sang CONFIRMED; số ghế còn của chuyến **giảm đúng số ghế** | ☐ | |
| CF-04 | Khách thấy booking đã duyệt ngay (không cần tải lại) | Trạng thái đổi, nút Chat sáng lên | ☐ | |
| CF-05 | Duyệt đến khi hết ghế | Chuyến thành FULL, biến mất khỏi tìm kiếm | ☐ | |
| CF-06 | Duyệt booking cần nhiều ghế hơn số còn lại | Báo "chuyến chỉ còn N ghế", booking vẫn chờ duyệt | ☐ | |
| CF-07 | Từ chối booking có nhập lý do | Booking sang REJECTED_BY_DRIVER; khách thấy lý do | ☐ | |
| CF-08 | Từ chối booking STRIPE đã giữ tiền | Tiền giữ được hủy (Stripe PI canceled), khách không bị trừ tiền | ☐ | |
| CF-09 | Từ chối không nhập lý do | Khách thấy "Không rõ" (không phải "null") | ☐ | |
| CF-10 | Từ chối booking CASH | Không có thao tác tiền, booking đóng | ☐ | |
| CF-11 | Hai tài khoản/máy cùng duyệt đồng thời 2 booking cuối cùng của chuyến còn 1 ghế | Chỉ 1 booking duyệt được, booking còn lại báo hết ghế; không bị âm ghế | ☐ | |
| CF-12 | Duyệt booking khi chuyến đã STARTED | Báo chuyến đã khởi hành, không duyệt được | ☐ | |
| CF-13 | Duyệt xong, trong lúc khách đã hủy cùng lúc (race) | Một trong hai thành công, không để ghế sai | ☐ | |
| CF-14 | Bấm duyệt 2 lần liên tiếp | Chỉ 1 lần có hiệu lực, ghế chỉ trừ 1 lần | ☐ | |
| CF-15 | Khi **MongoDB đang tắt**, bấm duyệt | Duyệt vẫn thành công (có thể chậm ≤ 2 giây), chỉ thiếu phòng chat | ☐ | |

## 12. Khách hủy booking

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| CAN-01 | Hủy booking đang "chờ thanh toán" | Booking CANCELLED_BY_USER, không có giao dịch tiền | ☐ | |
| CAN-02 | Hủy booking STRIPE đã giữ tiền, chờ duyệt | Booking đóng; PaymentIntent trên Stripe thành canceled; trạng thái thanh toán "Đã hủy" | ☐ | |
| CAN-03 | Hủy booking đã được duyệt (CONFIRMED) | Booking đóng; **số ghế của chuyến được trả lại**; nếu chuyến đang FULL thì mở lại thành OPEN và tìm lại thấy | ☐ | |
| CAN-04 | Hủy sau khi chuyến đã STARTED | Báo "Chuyến đã khởi hành, không thể huỷ" | ☐ | |
| CAN-05 | Hủy booking đã COMPLETED, đã hủy, hết hạn | Không có nút hủy | ☐ | |
| CAN-06 | Nhập lý do hủy | Tài xế thấy lý do (nếu có hiển thị) | ☐ | |
| CAN-07 | Tài xế thấy booking bị hủy ngay (không cần tải lại) | Danh sách cập nhật | ☐ | |
| CAN-08 | Hủy khi đang ở trong màn chat của tài xế | Màn chat của tài xế hiện thanh "Chuyến đã bị huỷ hoặc kết thúc, không thể nhắn tin nữa." ở **dưới cùng thay chỗ nhập tin** | ☐ | |
| CAN-09 | Bấm hủy 2 lần liên tiếp | Chỉ 1 lần có hiệu lực; ghế chỉ trả 1 lần | ☐ | |
| CAN-10 | Khách khác cố hủy booking của KH-1 (thao tác qua API) | Bị từ chối | ☐ | |

## 13. Hết hạn booking (cần chỉnh biến môi trường ở mục 0)

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| EXP-01 | Đặt chỗ STRIPE, **không thanh toán** trong 1 phút (với `BOOKING_PENDING_MINUTES=1`) | Booking tự chuyển EXPIRED; khách thấy "Hết hạn thanh toán" | ☐ | |
| EXP-02 | Sau EXP-01, PaymentIntent trên Stripe | Không còn giữ tiền | ☐ | |
| EXP-03 | Booking STRIPE đã thanh toán, tài xế không duyệt quá thời hạn chờ | Booking tự EXPIRED, tiền giữ được hủy | ☐ | |
| EXP-04 | Booking CASH chờ duyệt quá thời hạn | Booking tự EXPIRED | ☐ | |
| EXP-05 | Sau khi hết hạn, khách đặt lại cùng chuyến | Đặt được | ☐ | |
| EXP-06 | Ghế của chuyến sau khi booking chờ duyệt hết hạn | Không đổi (vì chưa từng bị trừ) | ☐ | |

## 14. Vòng đời chuyến và hệ quả lên booking, thanh toán

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| LIFE-01 | Chuyến có 1 booking CONFIRMED STRIPE (đã giữ tiền), tài xế bắt đầu rồi kết thúc | Tiền được **capture** (Stripe PI succeeded), thanh toán "Đã thanh toán", booking COMPLETED | ☐ | |
| LIFE-02 | Chuyến có 3 booking CONFIRMED (STRIPE và CASH lẫn lộn), kết thúc | Cả 3 booking COMPLETED; STRIPE được capture; CASH giữ nguyên trạng thái tiền mặt | ☐ | |
| LIFE-03 | Khi kết thúc, 1 booking STRIPE capture lỗi (giả lập bằng cách hủy PI trên Stripe Dashboard trước) | Chuyến vẫn kết thúc, các booking khác vẫn COMPLETED, booking lỗi có thanh toán FAILED | ☐ | |
| LIFE-04 | Có booking đang **chờ duyệt** khi tài xế bấm Bắt đầu | Booking đó tự REJECTED_BY_DRIVER, tiền giữ hủy, khách thấy lý do "Chuyến đã khởi hành, tài xế chưa duyệt booking" | ☐ | |
| LIFE-05 | Tài xế hủy chuyến khi có booking chờ thanh toán, chờ duyệt, đã duyệt | Cả 3 sang CANCELLED_BY_DRIVER; tiền giữ được hủy; ghế đã trừ được trả | ☐ | |
| LIFE-06 | Khách thấy ngay lý do hủy chuyến của tài xế | Hiện đúng "Tài xế huỷ chuyến: ..." | ☐ | |
| LIFE-07 | Chuyến quá giờ khởi hành 1 phút (`TRIP_NO_SHOW_CANCEL_MINUTES=1`), tài xế không bấm Bắt đầu | Hệ thống tự hủy chuyến, các booking sang CANCELLED_BY_DRIVER kèm lý do "Hệ thống tự huỷ..." | ☐ | |
| LIFE-08 | Chuyến đã STARTED quá giờ | Không bị tự hủy | ☐ | |
| LIFE-09 | Chuyến quá giờ đã bị hủy | Biến mất khỏi tìm kiếm, tài xế vẫn thấy trong danh sách với trạng thái CANCELED | ☐ | |
| LIFE-10 | Sau khi chuyến COMPLETED, khách xem booking | COMPLETED, không còn nút hủy | ☐ | |
| LIFE-11 | Khách đã đặt, chuyến FULL mà một booking khác hủy | Chuyến mở lại OPEN | ☐ | |

## 15. Thu tiền mặt (tài xế)

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| CASH-01 | Booking CASH đã duyệt, tài xế bấm xác nhận đã nhận tiền | Thanh toán sang "Đã thanh toán", báo realtime cho khách | ☐ | |
| CASH-02 | Bấm xác nhận khi booking **chưa duyệt** (chờ duyệt) | Bị chặn: "Chỉ xác nhận đã nhận tiền khi booking đã được duyệt" | ☐ | |
| CASH-03 | Bấm xác nhận 2 lần | Lần 2 không gây lỗi (idempotent) | ☐ | |
| CASH-04 | Bấm xác nhận cho booking STRIPE | Không có nút, hoặc báo "không phải CASH" | ☐ | |
| CASH-05 | Xác nhận tiền mặt sau khi chuyến đã COMPLETED | Cho phép, thu nhập được cập nhật | ☐ | |
| CASH-06 | Booking CASH đã hủy hoặc bị từ chối | Không xác nhận được | ☐ | |

## 16. Thu nhập và ví (tài xế, Stripe Connect)

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| EARN-01 | Mở màn thu nhập khi chưa có chuyến hoàn thành | Hiện 0, biểu đồ rỗng, không lỗi | ☐ | |
| EARN-02 | Sau khi hoàn thành chuyến có tiền Stripe | Doanh thu, phí nền tảng, thực nhận đúng (thực nhận = doanh thu − phí) | ☐ | |
| EARN-03 | Chuyến chỉ có tiền mặt | Thực nhận = doanh thu (không trừ phí) | ☐ | |
| EARN-04 | Biểu đồ theo ngày/tháng | Cột đúng số liệu, chuyển chế độ không lỗi | ☐ | |
| EARN-05 | Trang chủ tài xế | "Thực nhận" và điểm đánh giá hiển thị thật, không phải số giả | ☐ | |
| EARN-06 | Mở màn Ví/Rút tiền khi chưa thiết lập tài khoản Stripe Connect | Có nút thiết lập, bấm mở trang onboarding trên trình duyệt | ☐ | |
| EARN-07 | Hoàn thành onboarding rồi quay lại app | Trạng thái ví được tải lại, hiện đã thiết lập | ☐ | |
| EARN-08 | Có tiền chờ chuyển bù từ trước khi thiết lập tài khoản | Mở màn Ví thì số tiền được chuyển bù | ☐ | |
| EARN-09 | Bấm Rút tiền khi số dư lớn hơn 0 | Tạo payout; số dư giảm | ☐ | |
| EARN-10 | Rút khi số dư bằng 0 hoặc chưa thiết lập | Báo lỗi rõ ràng, không crash | ☐ | |

## 17. Chat

Tiên quyết: MongoDB đang chạy, có booking đã được duyệt giữa KH-1 và TX-A.

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| CHAT-01 | Booking **chưa duyệt**, khách xem nút Chat | Nút mờ, ghi "Chat sau khi xác nhận", không bấm được | ☐ | |
| CHAT-02 | Booking chưa duyệt, tài xế xem nút Chat | Nút mờ "Chat sau khi duyệt" | ☐ | |
| CHAT-03 | Sau khi duyệt, nút Chat sáng ở cả 2 bên | Bấm mở màn chat, tên đối phương đúng ở header | ☐ | |
| CHAT-04 | Tab Tin nhắn có hội thoại sau khi duyệt | Hiện đúng tên đối phương và giờ chuyến | ☐ | |
| CHAT-05 | Khách gửi tin | Tin hiện ngay ở khách; tài xế thấy ngay (không cần tải lại) | ☐ | |
| CHAT-06 | Tài xế trả lời | Khách thấy ngay | ☐ | |
| CHAT-07 | Gửi nhiều tin liên tiếp | Thứ tự đúng, không trùng, không mất | ☐ | |
| CHAT-08 | Gửi tin rỗng hoặc chỉ toàn dấu cách | Không gửi (nút gửi mờ hoặc bị bỏ qua) | ☐ | |
| CHAT-09 | Gửi tin dài hơn 1000 ký tự (ô nhập tối đa 2000) | Server từ chối, hiện báo lỗi trong màn chat | ☐ | |
| CHAT-10 | Gửi tiếng Việt có dấu, emoji | Hiển thị đúng ở cả 2 bên | ☐ | |
| CHAT-11 | Thoát màn chat rồi vào lại | Lịch sử tin nhắn vẫn còn đầy đủ | ☐ | |
| CHAT-12 | Tab Tin nhắn sau khi gửi | Hiện tin nhắn cuối ở dòng xem trước (sau khi mở lại tab) | ☐ | |
| CHAT-13 | Tắt mạng, bấm gửi | Báo "Đang mất kết nối. Tin nhắn chưa được gửi." | ☐ | |
| CHAT-14 | Bật lại mạng | Màn chat tự kết nối lại, gửi được | ☐ | |
| CHAT-15 | Khách hủy booking khi tài xế **đang mở màn chat** | Tài xế thấy thanh "Chuyến đã bị huỷ hoặc kết thúc..." ở dưới cùng, ô nhập biến mất | ☐ | |
| CHAT-16 | Tài xế hủy chuyến khi khách đang mở chat | Khách thấy cùng thanh thông báo ở dưới | ☐ | |
| CHAT-17 | Kết thúc chuyến (booking COMPLETED) khi đang mở chat | Cùng thanh thông báo, đọc được lịch sử | ☐ | |
| CHAT-18 | Tắt app tài xế, khách hủy, mở lại app rồi vào chat cũ bấm gửi | Hiện báo lỗi từ server, không âm thầm mất tin | ☐ | |
| CHAT-19 | Người ngoài không thuộc booking | Không thấy phòng chat trong danh sách của họ | ☐ | |
| CHAT-20 | Bấm Back từ màn chat | Về đúng màn trước (Tin nhắn hoặc danh sách booking) | ☐ | |
| CHAT-21 | Mở chat từ nút ở danh sách booking, khác với mở từ tab Tin nhắn | Cùng một phòng, cùng lịch sử | ☐ | |
| CHAT-22 | Nhiều booking với nhiều khách khác nhau | Mỗi phòng tách biệt, tin không lẫn sang phòng khác | ☐ | |
| CHAT-23 | Tắt MongoDB rồi mở tab Tin nhắn | Báo lỗi tải danh sách, không treo app; mở lại Mongo và bấm "Thử lại" thì tải được | ☐ | |
| CHAT-24 | Tắt MongoDB rồi mở tab Chuyến xe (khách và tài xế) | Danh sách booking vẫn tải được (chat không làm hỏng tab này), nút Chat mờ | ☐ | |
| CHAT-25 | Phòng chat của booking duyệt lúc Mongo tắt (thiếu phòng) | Sau khi bật Mongo, mở tab Tin nhắn thì phòng được tạo lại | ☐ | |

## 18. Realtime (không cần kéo tải lại)

Mở app khách và app tài xế cạnh nhau (2 máy hoặc 1 máy + giả lập).

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| RT-01 | Khách đặt chỗ | Danh sách booking của tài xế tự thêm | ☐ | |
| RT-02 | Khách thanh toán xong | Tài xế thấy trạng thái đã đặt cọc | ☐ | |
| RT-03 | Tài xế duyệt, từ chối | Khách thấy đổi trạng thái ngay | ☐ | |
| RT-04 | Khách hủy | Tài xế thấy ngay | ☐ | |
| RT-05 | Admin duyệt hồ sơ khi tài xế đang ở màn "Chờ duyệt" | Tài xế tự vào màn chính | ☐ | |
| RT-06 | Admin duyệt hoặc từ chối xe | App tài xế cập nhật trạng thái xe | ☐ | |
| RT-07 | Đưa app xuống nền rồi mở lại | Dữ liệu được tải lại, kết nối tự khôi phục | ☐ | |
| RT-08 | Tắt Wi-Fi 1 phút rồi bật lại | App tự kết nối lại; trong lúc mất kết nối vẫn tự tải lại mỗi ~30 giây | ☐ | |
| RT-09 | Đăng xuất ở app | Dừng kết nối realtime (không còn nhận sự kiện của user cũ) | ☐ | |
| RT-10 | Đăng nhập tài khoản khác trên cùng app | Chỉ nhận sự kiện của tài khoản mới | ☐ | |
| RT-11 | Mở log backend khi thao tác | Thấy dòng `[RT] gửi BOOKING_UPDATED → user=...` cho đúng người | ☐ | |

## 19. Admin app

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| ADM-01 | Dashboard | Hiện số liệu thống kê và danh sách hồ sơ tài xế, xe chờ duyệt | ☐ | |
| ADM-02 | Duyệt, từ chối tài xế (DRV-07, 09) | Danh sách cập nhật ngay sau thao tác | ☐ | |
| ADM-03 | Duyệt, từ chối xe (VEH-05, 06) | Cập nhật ngay | ☐ | |
| ADM-04 | Xem ảnh giấy tờ (bấm vào ảnh) | Phóng to toàn màn hình, tải được (có JWT) | ☐ | |
| ADM-05 | Danh sách rỗng | Hiện trạng thái rỗng, không lỗi | ☐ | |
| ADM-06 | Hết phiên (token hết hạn) | Quay về đăng nhập, không treo | ☐ | |
| ADM-07 | Số tỉnh/phường (`GET /admin/locations/stats`) | Đúng số đã seed | ☐ | |

## 20. Chọn địa điểm trên bản đồ (khách)

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| MAP-01 | Mở chọn điểm đón, bản đồ căn giữa phường đã chọn | Hiện đúng khu vực phường/tỉnh | ☐ | |
| MAP-02 | Ghim một điểm trên bản đồ | Địa chỉ tự điền, tọa độ hiển thị | ☐ | |
| MAP-03 | Ghim liên tục nhiều lần nhanh | Không báo lỗi lung tung, không nhảy vị trí, kết quả cuối là điểm ghim cuối | ☐ | |
| MAP-04 | Gõ địa chỉ vào ô tìm kiếm | Hiện gợi ý trong tỉnh, chọn một gợi ý thì bản đồ nhảy tới đó | ☐ | |
| MAP-05 | Gõ địa chỉ không tồn tại | Báo "không tìm thấy" | ☐ | |
| MAP-06 | Tắt mạng khi tìm | Báo "lỗi kết nối", không báo "không tìm thấy" | ☐ | |
| MAP-07 | Dùng nút GPS | Điền vị trí hiện tại; từ chối quyền thì báo lỗi nhẹ nhàng | ☐ | |
| MAP-08 | Điểm ghim ngoài tỉnh đã chọn | Bị loại hoặc báo | ☐ | |
| MAP-09 | Kéo, zoom bản đồ | Mượt, không giật về chỗ cũ | ☐ | |
| MAP-10 | Đổi phường sau khi đã ghim | Tọa độ bị reset | ☐ | |

## 21. Phiên đăng nhập và token

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| SES-01 | Dùng app liên tục quá 15 phút | Token tự làm mới, không bị đá ra ngoài | ☐ | |
| SES-02 | Đăng nhập ở máy A, đăng xuất ở máy A | Máy B (cùng tài khoản) vẫn dùng bình thường (phiên độc lập) | ☐ | |
| SES-03 | Xóa Redis (hoặc khởi động lại Redis) khi app đang mở | Lần gọi tiếp theo bị đưa về đăng nhập, không treo | ☐ | |
| SES-04 | Đổi mật khẩu | Phiên hiện tại tiếp tục hoặc yêu cầu đăng nhập lại (ghi nhận hành vi) | ☐ | |
| SES-05 | Nhiều request cùng lúc khi token hết hạn | Chỉ 1 lần refresh, các request đều thành công sau đó | ☐ | |

## 22. Giao diện chung và các trường hợp biên

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| UI-01 | Tắt mạng rồi thao tác bất kỳ | Báo lỗi rõ ràng, app không crash | ☐ | |
| UI-02 | Backend tắt đột ngột | Báo lỗi kết nối, không treo spinner mãi | ☐ | |
| UI-03 | Danh sách dài (nhiều booking, nhiều chuyến) | Cuộn mượt, không giật | ☐ | |
| UI-04 | Đổi giữa các tab nhiều lần | Không reset vô cớ, dữ liệu đúng | ☐ | |
| UI-05 | Thông báo trên màn hình (banner) | Tự tắt sau khoảng 3 giây | ☐ | |
| UI-06 | Xoay màn hình, bàn phím che ô nhập | Ô nhập tin nhắn, form đặt chỗ không bị che | ☐ | |
| UI-07 | Chữ tiếng Việt có dấu, chữ đậm | Hiển thị đúng font, không lỗi ký tự | ☐ | |
| UI-08 | Chạy bản web (`npm run web`) | Đăng nhập, tìm, đặt CASH, hộp thoại hoạt động (trừ Stripe, bản đồ có thể khác) | ☐ | |
| UI-09 | Thẻ booking trạng thái dài, tên dài | Không tràn, không cắt xấu | ☐ | |
| UI-10 | Chạm nhanh nhiều lần vào các nút hành động (đặt, duyệt, hủy, gửi) | Chỉ 1 lần có hiệu lực | ☐ | |
| UI-11 | Thông báo và Tin nhắn trống | Có trạng thái rỗng thân thiện | ☐ | |
| UI-12 | Tab "Thông báo" | Là màn tạm (chưa làm), không gây lỗi | ☐ | |

## 23. Bảo mật nhìn từ giao diện

| ID | Bước | Kết quả mong đợi | KQ | Ghi chú |
|---|---|---|---|---|
| SEC-01 | Khách A xem booking của khách B (bằng link/ID, qua Postman nếu cần) | Không xem được | ☐ | |
| SEC-02 | Tài xế X duyệt booking của chuyến của tài xế Y | Bị từ chối (403) | ☐ | |
| SEC-03 | Khách gọi API tài xế (`/driver/...`) | 403 | ☐ | |
| SEC-04 | Gọi API không có token | 401 | ☐ | |
| SEC-05 | Sửa số tiền gửi lên khi tạo thanh toán | Server bỏ qua, luôn tính từ giá chuyến | ☐ | |
| SEC-06 | Thử vào phòng chat của người khác (subscribe `/topic/chat/{id}` bằng công cụ WebSocket) | Kết nối bị đóng, không nhận tin | ☐ | |
| SEC-07 | Gửi trực tiếp vào `/topic/chat/{id}` mà không qua `/app/chat.send` | Bị chặn | ☐ | |
| SEC-08 | Gửi tin chat với `senderId` giả hoặc `id` trùng tin cũ | Server bỏ qua, người gửi luôn lấy theo token, không ghi đè tin cũ | ☐ | |
| SEC-09 | Ảnh trong `/uploads` (giấy tờ) không có token | Không tải được | ☐ | |
| SEC-10 | Webhook giả thanh toán thành công | Bị từ chối (xem PAY-14, PAY-15) | ☐ | |

## 24. Ghi chú

- **Đánh giá tài xế (review):** backend có `POST /customer/reviews/{tripId}` nhưng **app khách chưa có màn hình**, nên chưa test được qua giao diện. Có thể test bằng Postman: chỉ chuyến COMPLETED, khách có booking, 1 đánh giá cho mỗi chuyến, điểm 1 đến 5, điểm trung bình tài xế cập nhật.
- **Hoàn tiền thanh toán đã thu (PAID):** chưa làm (RefundService là stub), không test.
- **Thông báo:** chưa làm.
- Khi phát hiện lỗi, ghi lại: mã test case, bước, kết quả thực tế, giờ xảy ra, và dòng log backend tương ứng (nếu có).
