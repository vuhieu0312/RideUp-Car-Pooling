package com.rideup.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Mã lỗi chuẩn của hệ thống.
 *
 * <p>Mỗi code gồm:
 * <ul>
 *   <li><b>code</b>: số int — dùng cho client xử lý tự động (i18n, retry...)</li>
 *   <li><b>message</b>: tiếng Việt — hiện cho end-user</li>
 *   <li><b>httpStatus</b>: HTTP status code tương ứng — GlobalExceptionHandler dùng</li>
 * </ul>
 *
 * <p>Code số từ 1000+ tránh nhầm với HTTP status (400, 401, 403...).</p>
 * <p>Khi thêm code mới: append vào cuối enum, không đổi code cũ (backward-compat).</p>
 */
@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION        (9999, "Lỗi không xác định",                HttpStatus.INTERNAL_SERVER_ERROR),
    USER_EXISTED                    (1001, "Người dùng đã tồn tại",                HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED                (1005, "Người dùng không tồn tại",              HttpStatus.NOT_FOUND),
    EMAIL_EXISTED                   (1009, "Email đã được sử dụng bởi tài khoản khác", HttpStatus.BAD_REQUEST),
    PHONE_EXISTED                   (1011, "Số điện thoại đã được sử dụng",        HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD                (1003, "Mật khẩu không hợp lệ",                HttpStatus.BAD_REQUEST),
    PASSWORD_NOT_CORRECT            (1017, "Mật khẩu không đúng",                  HttpStatus.BAD_REQUEST),
    INVALID_DOB                     (1008, "Tuổi phải từ {min} trở lên",            HttpStatus.BAD_REQUEST),
    UNAUTHENTICATED                 (1006, "Chưa xác thực",                        HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED                   (1007, "Bạn không có quyền truy cập",           HttpStatus.FORBIDDEN),
    INVALID_OR_EXPIRED_TOKEN        (1010, "Token đã hết hạn hoặc không hợp lệ",    HttpStatus.UNAUTHORIZED),
    DRIVER_PROFILE_NOT_FOUND        (1018, "Chưa có hồ sơ tài xế. Vui lòng đăng ký trước", HttpStatus.FORBIDDEN),
    DRIVER_PROFILE_NOT_APPROVED     (1019, "Hồ sơ tài xế chưa được admin duyệt",   HttpStatus.FORBIDDEN),
    DRIVER_PROFILE_LOCKED           (1020, "Hồ sơ tài xế đang bị khoá",             HttpStatus.FORBIDDEN),
    DRIVER_PROFILE_INCOMPLETE       (1021, "Hồ sơ tài xế chưa đầy đủ thông tin",    HttpStatus.BAD_REQUEST),
    VEHICLE_ALREADY_EXISTS          (1019, "Tài xế đã có xe đăng ký",              HttpStatus.BAD_REQUEST),
    VEHICLE_NOT_VERIFIED            (1020, "Xe chưa được admin duyệt",               HttpStatus.FORBIDDEN),
    TRIP_NOT_FOUND                  (1022, "Không tìm thấy chuyến xe",              HttpStatus.NOT_FOUND),
    TRIP_NO_AVAILABLE_SEATS         (1041, "Chuyến đã hết ghế trống",               HttpStatus.BAD_REQUEST),
    TRIP_CANCEL_NOT_ALLOWED         (1023, "Không thể huỷ chuyến ở trạng thái hiện tại", HttpStatus.BAD_REQUEST),
    TRIP_START_NOT_ALLOWED          (1024, "Không thể bắt đầu chuyến ở trạng thái hiện tại", HttpStatus.BAD_REQUEST),
    TRIP_COMPLETE_NOT_ALLOWED       (1025, "Không thể kết thúc chuyến ở trạng thái hiện tại", HttpStatus.BAD_REQUEST),
    TRIP_START_BEFORE_SCHEDULE      (1026, "Chưa đến giờ khởi hành. Bạn chỉ có thể bắt đầu chuyến sau thời gian đã khai báo", HttpStatus.BAD_REQUEST),
    BOOKING_NOT_FOUND               (1027, "Không tìm thấy booking",                HttpStatus.NOT_FOUND),
    BOOKING_ALREADY_ACTIVE          (1028, "Bạn đã có booking đang hoạt động cho chuyến này", HttpStatus.CONFLICT),
    BOOKING_NOT_ALLOWED             (1029, "Chỉ booking chuyến đã hoàn thành mới được đánh giá", HttpStatus.BAD_REQUEST),
    BOOKING_INVALID_RATING          (1030, "Điểm đánh giá phải từ 1 đến 5",          HttpStatus.BAD_REQUEST),
    BOOKING_LOCATION_OUT_OF_RANGE   (1033, "Điểm đón/trả phải trong vòng 20km so với trung tâm phường/xã", HttpStatus.BAD_REQUEST),
    BOOKING_POINT_NOT_FOUND         (1040, "Điểm đón/trả đã chọn không thuộc chuyến này", HttpStatus.BAD_REQUEST),
    BOOKING_CANCEL_NOT_ALLOWED      (1041, "Không thể huỷ booking ở trạng thái hiện tại", HttpStatus.BAD_REQUEST),
    BOOKING_CANCEL_TOO_LATE         (1042, "Chỉ huỷ booking trước giờ khởi hành ít nhất 1 giờ", HttpStatus.BAD_REQUEST),
    PAYMENT_NOT_FOUND               (1031, "Không tìm thấy thanh toán",              HttpStatus.NOT_FOUND),
    PAYMENT_CONFIRM_NOT_ALLOWED     (1032, "Không thể xác nhận thanh toán",            HttpStatus.BAD_REQUEST),
    PAYMENT_REFUND_FAILED           (1044, "Hoàn tiền VNPAY thất bại",                HttpStatus.BAD_REQUEST),
    UNCONFIRMED_CASH_PAYMENTS       (1045, "Vui lòng xác nhận tất cả thanh toán tiền mặt trước khi kết thúc chuyến đi", HttpStatus.BAD_REQUEST),
    CHAT_THREAD_NOT_FOUND           (1034, "Không tìm thấy cuộc hội thoại",           HttpStatus.NOT_FOUND),
    CHAT_FORBIDDEN                  (1035, "Bạn không có quyền truy cập cuộc hội thoại này", HttpStatus.FORBIDDEN),
    CHAT_NOT_ALLOWED                (1036, "Chỉ có thể chat trước khi chuyến kết thúc", HttpStatus.BAD_REQUEST),
    CHAT_MESSAGE_INVALID            (1037, "Tin nhắn không hợp lệ",                  HttpStatus.BAD_REQUEST),
    VNPAY_NOT_CONFIGURED            (1038, "VNPAY chưa được cấu hình trên backend",  HttpStatus.BAD_REQUEST),
    BOOKING_REQUEST_INVALID         (1039, "Yêu cầu đặt chỗ không hợp lệ",          HttpStatus.BAD_REQUEST);

    private final int code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(int code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}