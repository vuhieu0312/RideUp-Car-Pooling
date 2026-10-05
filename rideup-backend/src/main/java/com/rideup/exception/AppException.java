package com.rideup.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Exception chuẩn của hệ thống — wrap {@link ErrorCode} hoặc (status, code, message) tuỳ trường hợp.
 *
 * <p>Cách dùng:</p>
 * <ul>
 *   <li>Truyền {@link ErrorCode} enum (code/msg/status từ enum):
 *       <pre>{@code throw new AppException(ErrorCode.USER_NOT_EXISTED);}</pre></li>
 *   <li>Truyền status/code/message trực tiếp:
 *       <pre>{@code throw AppException.notFound("User not found");}</pre></li>
 * </ul>
 */
@Getter
public class AppException extends RuntimeException {
    private final ErrorCode errorCode;

    /**
     * Constructor dùng ErrorCode enum.
     */
    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public AppException(HttpStatus status, int code, String message) {
        super(message);
        this.errorCode = null;
        this.status = status;
        this.code = code;
    }

    // Chỉ dùng khi errorCode == null
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
    // Factory methods
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