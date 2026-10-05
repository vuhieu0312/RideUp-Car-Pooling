package com.rideup.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Exception chuẩn của hệ thống — wrap {@link ErrorCode}.
 *
 * <p>2 cách dùng:
 * <ul>
 *   <li><b>Recommended</b>: truyền ErrorCode enum (code/msg/status từ enum):
 *       <pre>{@code throw new AppException(ErrorCode.USER_NOT_EXISTED);}</pre></li>
 *   <li><b>Legacy</b>: factory method cũ — backward-compat với code hiện có:
 *       <pre>{@code throw AppException.notFound("User not found");}</pre></li>
 * </ul>
 *
 * <p>Nên dùng ErrorCode cho code mới (client biết số lỗi cụ thể để i18n/retry).</p>
 */
@Getter
public class AppException extends RuntimeException {
    private final ErrorCode errorCode;  // null với legacy constructors

    /**
     * Constructor khuyến nghị - dùng ErrorCode enum.
     */
    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    /**
     * Legacy constructor - giữ để không break code cũ. Ưu tiên dùng constructor trên.
     */
    public AppException(HttpStatus status, int code, String message) {
        super(message);
        this.errorCode = null;
        this.status = status;
        this.code = code;
    }

    // Legacy fields - chỉ dùng khi errorCode == null
    private HttpStatus status;
    private int code;

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public int getCode() {
        return errorCode != null ? errorCode.getCode() : code;
    }

    public HttpStatus getStatus() {
        return errorCode != null ? errorCode.getHttpStatus() : status;
    }

    // ============================================================
    // Backward-compat factory methods
    // ============================================================
    public static AppException badRequest(String message) {
        return new AppException(HttpStatus.BAD_REQUEST, 400, message);
    }

    public static AppException unauthorized(String message) {
        return new AppException(HttpStatus.UNAUTHORIZED, 401, message);
    }

    public static AppException forbidden(String message) {
        return new AppException(HttpStatus.FORBIDDEN, 403, message);
    }

    public static AppException notFound(String message) {
        return new AppException(HttpStatus.NOT_FOUND, 404, message);
    }

    public static AppException conflict(String message) {
        return new AppException(HttpStatus.CONFLICT, 409, message);
    }
}