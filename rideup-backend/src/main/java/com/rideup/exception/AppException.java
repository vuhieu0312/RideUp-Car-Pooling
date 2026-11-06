package com.rideup.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {
    private final ErrorCode errorCode;

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

    // chỉ dùng khi không có errorCode
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