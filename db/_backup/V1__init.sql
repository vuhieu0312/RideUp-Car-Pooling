-- RideUp V1__init.sql
-- Schema theo ERD đã chốt (Monolith)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- 1. identity
-- =============================================================
CREATE TABLE app_user (
    id              CHAR(36)        NOT NULL,
    full_name       VARCHAR(150)    NOT NULL,
    phone           VARCHAR(20)     NOT NULL,
    email           VARCHAR(150)    NOT NULL,
    password        VARCHAR(255)    NOT NULL,
    date_of_birth   DATE            NULL,
    gender          VARCHAR(10)     NULL,
    avatar_url      VARCHAR(500)    NULL,
    verified        TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL,
    updated_at      DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_app_user_email (email),
    KEY idx_app_user_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE app_user_role (
    user_id     CHAR(36)        NOT NULL,
    role        VARCHAR(20)     NOT NULL,
    PRIMARY KEY (user_id, role),
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE driver_profile (
    id                  CHAR(36)        NOT NULL,
    user_id             CHAR(36)        NOT NULL,
    cccd                VARCHAR(20)     NOT NULL,
    cccd_image_front    VARCHAR(500)    NULL,
    cccd_image_back     VARCHAR(500)    NULL,
    gplx                VARCHAR(20)     NOT NULL,
    gplx_expiry_date    DATE            NULL,
    gplx_image          VARCHAR(500)    NULL,
    driver_rating       DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
    total_driver_rides  INT             NOT NULL DEFAULT 0,
    status              VARCHAR(20)     NOT NULL,
    approved_at         DATETIME        NULL,
    approved_by         CHAR(36)        NULL,
    rejected_at         DATETIME        NULL,
    rejection_reason    VARCHAR(500)    NULL,
    created_at          DATETIME        NOT NULL,
    updated_at          DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_driver_profile_user (user_id),
    CONSTRAINT fk_driver_profile_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_token (
    id          CHAR(36)        NOT NULL,
    user_id     CHAR(36)        NOT NULL,
    token       VARCHAR(500)    NOT NULL,
    expiry_date DATETIME        NOT NULL,
    revoked     TINYINT(1)      NOT NULL DEFAULT 0,
    created_at  DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_refresh_token_token (token),
    KEY idx_refresh_token_user (user_id),
    CONSTRAINT fk_refresh_token_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicle (
    id                          CHAR(36)        NOT NULL,
    driver_id                   CHAR(36)        NOT NULL,
    plate_number                VARCHAR(20)     NOT NULL,
    vehicle_brand               VARCHAR(100)    NULL,
    vehicle_model               VARCHAR(100)    NULL,
    vehicle_year                INT             NULL,
    vehicle_color               VARCHAR(50)     NULL,
    seat_capacity               INT             NOT NULL,
    vehicle_type                VARCHAR(20)     NOT NULL,
    vehicle_image               VARCHAR(500)    NULL,
    registration_image          VARCHAR(500)    NULL,
    registration_expiry_date    DATE            NULL,
    insurance_image             VARCHAR(500)    NULL,
    insurance_expiry_date       DATE            NULL,
    is_verified                 TINYINT(1)      NOT NULL DEFAULT 0,
    is_active                   TINYINT(1)      NOT NULL DEFAULT 1,
    approved_at                 DATETIME        NULL,
    approved_by                 CHAR(36)        NULL,
    rejected_at                 DATETIME        NULL,
    rejection_reason            VARCHAR(500)    NULL,
    created_at                  DATETIME        NOT NULL,
    updated_at                  DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_vehicle_driver (driver_id),
    UNIQUE KEY uk_vehicle_plate (plate_number),
    CONSTRAINT fk_vehicle_driver FOREIGN KEY (driver_id) REFERENCES driver_profile(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 2. location
-- =============================================================
CREATE TABLE province (
    id      CHAR(36)        NOT NULL,
    name    VARCHAR(150)    NOT NULL,
    code    VARCHAR(20)     NOT NULL,
    lat     DECIMAL(10,7)  NULL,
    lng     DECIMAL(10,7)  NULL,
    osmid   BIGINT          NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_province_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ward (
    id           CHAR(36)        NOT NULL,
    province_id  CHAR(36)        NOT NULL,
    name         VARCHAR(150)    NOT NULL,
    code         VARCHAR(20)     NOT NULL,
    lat          DECIMAL(10,7)  NULL,
    lng          DECIMAL(10,7)  NULL,
    osmid        BIGINT          NULL,
    display_name VARCHAR(250)    NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ward_code (code),
    KEY idx_ward_province (province_id),
    CONSTRAINT fk_ward_province FOREIGN KEY (province_id) REFERENCES province(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 3. trip
-- =============================================================
CREATE TABLE trip (
    id                       CHAR(36)        NOT NULL,
    driver_id                CHAR(36)        NOT NULL,
    vehicle_id               CHAR(36)        NOT NULL,
    start_province_id        CHAR(36)        NOT NULL,
    end_province_id          CHAR(36)        NOT NULL,
    start_address_text       VARCHAR(500)    NULL,
    end_address_text         VARCHAR(500)    NULL,
    departure_time           DATETIME        NOT NULL,
    estimated_arrival_time   DATETIME        NULL,
    seat_total               INT             NOT NULL,
    seat_available           INT             NOT NULL,
    price_vnd                DECIMAL(15,2)   NOT NULL,
    status                   VARCHAR(20)     NOT NULL,
    version                  BIGINT          NOT NULL DEFAULT 0,
    note                     VARCHAR(1000)   NULL,
    created_at               DATETIME        NOT NULL,
    updated_at               DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_trip_driver (driver_id),
    KEY idx_trip_vehicle (vehicle_id),
    KEY idx_trip_start_province (start_province_id),
    KEY idx_trip_end_province (end_province_id),
    KEY idx_trip_departure (departure_time),
    KEY idx_trip_status (status),
    CONSTRAINT fk_trip_driver FOREIGN KEY (driver_id) REFERENCES driver_profile(id),
    CONSTRAINT fk_trip_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle(id),
    CONSTRAINT fk_trip_start_province FOREIGN KEY (start_province_id) REFERENCES province(id),
    CONSTRAINT fk_trip_end_province FOREIGN KEY (end_province_id) REFERENCES province(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE trip_stop (
    id            CHAR(36)        NOT NULL,
    trip_id       CHAR(36)        NOT NULL,
    stop_type     VARCHAR(20)     NOT NULL,
    ward_id       CHAR(36)        NOT NULL,
    address_text  VARCHAR(500)    NULL,
    PRIMARY KEY (id),
    KEY idx_trip_stop_trip (trip_id),
    KEY idx_trip_stop_ward (ward_id),
    CONSTRAINT fk_trip_stop_trip FOREIGN KEY (trip_id) REFERENCES trip(id) ON DELETE CASCADE,
    CONSTRAINT fk_trip_stop_ward FOREIGN KEY (ward_id) REFERENCES ward(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 4. booking
-- =============================================================
CREATE TABLE booking (
    id                      CHAR(36)        NOT NULL,
    booking_code            VARCHAR(30)     NOT NULL,
    customer_id             CHAR(36)        NOT NULL,
    trip_id                 CHAR(36)        NOT NULL,
    status                  VARCHAR(30)     NOT NULL,
    payment_id              CHAR(36)        NULL,
    payment_status          VARCHAR(20)     NOT NULL,
    seat_count              INT             NOT NULL,
    price_per_seat          DECIMAL(15,2)   NOT NULL,
    total_amount            DECIMAL(15,2)   NOT NULL,
    reserved_at             DATETIME        NOT NULL,
    expires_at              DATETIME        NULL,
    driver_approved         TINYINT(1)      NOT NULL DEFAULT 0,
    pickup_lat              DOUBLE          NULL,
    pickup_lng              DOUBLE          NULL,
    pickup_address_text     VARCHAR(500)    NULL,
    dropoff_ward_id         CHAR(36)        NULL,
    dropoff_lat             DOUBLE          NULL,
    dropoff_lng             DOUBLE          NULL,
    dropoff_address_text    VARCHAR(500)    NULL,
    note                    VARCHAR(1000)   NULL,
    cancelled_at            DATETIME        NULL,
    cancel_reason           VARCHAR(500)    NULL,
    trip_version_at_reserve BIGINT          NULL,
    version                 BIGINT          NOT NULL DEFAULT 0,
    created_at              DATETIME        NOT NULL,
    updated_at              DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_booking_code (booking_code),
    KEY idx_booking_customer (customer_id),
    KEY idx_booking_trip (trip_id),
    KEY idx_booking_status (status),
    KEY idx_booking_dropoff_ward (dropoff_ward_id),
    CONSTRAINT fk_booking_customer FOREIGN KEY (customer_id) REFERENCES app_user(id),
    CONSTRAINT fk_booking_trip FOREIGN KEY (trip_id) REFERENCES trip(id),
    CONSTRAINT fk_booking_dropoff_ward FOREIGN KEY (dropoff_ward_id) REFERENCES ward(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 5. payment
-- =============================================================
CREATE TABLE payment (
    id              CHAR(36)        NOT NULL,
    booking_id      CHAR(36)        NOT NULL,
    correlation_id  VARCHAR(100)    NULL,
    amount          DECIMAL(15,2)   NOT NULL,
    method          VARCHAR(20)     NOT NULL,
    status          VARCHAR(20)     NOT NULL,
    transaction_id  VARCHAR(100)    NULL,
    payment_url     VARCHAR(1000)   NULL,
    paid_at         DATETIME        NULL,
    failure_reason  VARCHAR(500)    NULL,
    pay_date        VARCHAR(100)    NULL,
    created_at      DATETIME        NOT NULL,
    updated_at      DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_booking (booking_id),
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES booking(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE booking
    ADD CONSTRAINT fk_booking_payment FOREIGN KEY (payment_id) REFERENCES payment(id);

CREATE TABLE refund (
    id              CHAR(36)        NOT NULL,
    payment_id      CHAR(36)        NOT NULL,
    amount          DECIMAL(15,2)   NOT NULL,
    status          VARCHAR(20)     NOT NULL,
    request_id      VARCHAR(100)    NULL,
    response_code   VARCHAR(50)     NULL,
    failure_reason  VARCHAR(500)    NULL,
    refunded_at     DATETIME        NULL,
    correlation_id  VARCHAR(100)    NULL,
    created_at      DATETIME        NOT NULL,
    updated_at      DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_refund_payment (payment_id),
    CONSTRAINT fk_refund_payment FOREIGN KEY (payment_id) REFERENCES payment(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 6. chat
-- =============================================================
CREATE TABLE conversation (
    id                     CHAR(36)        NOT NULL,
    booking_id             CHAR(36)        NOT NULL,
    participants           JSON            NULL,
    last_message_preview   VARCHAR(500)    NULL,
    last_message_sender_id CHAR(36)        NULL,
    last_message_at        DATETIME        NULL,
    created_at             DATETIME        NOT NULL,
    updated_at             DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_conversation_booking (booking_id),
    CONSTRAINT fk_conversation_booking FOREIGN KEY (booking_id) REFERENCES booking(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversation_member (
    conversation_id    CHAR(36)    NOT NULL,
    user_id            CHAR(36)    NOT NULL,
    last_read_at       DATETIME    NULL,
    PRIMARY KEY (conversation_id, user_id),
    KEY idx_conv_member_user (user_id),
    CONSTRAINT fk_conv_member_conv FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
    CONSTRAINT fk_conv_member_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message (
    id              CHAR(36)        NOT NULL,
    conversation_id CHAR(36)        NOT NULL,
    sender_id       CHAR(36)        NOT NULL,
    type            VARCHAR(20)     NOT NULL,
    content         TEXT            NULL,
    media_url       VARCHAR(1000)   NULL,
    deleted_at      DATETIME        NULL,
    deleted_by      CHAR(36)        NULL,
    created_at      DATETIME        NOT NULL,
    PRIMARY KEY (id),
    KEY idx_message_conv (conversation_id),
    KEY idx_message_sender (sender_id),
    CONSTRAINT fk_message_conv FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
    CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES app_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE call_session (
    id              CHAR(36)        NOT NULL,
    conversation_id CHAR(36)        NOT NULL,
    request_id      VARCHAR(100)    NOT NULL,
    callee_id       CHAR(36)        NOT NULL,
    status          VARCHAR(20)     NOT NULL,
    started_at      DATETIME        NULL,
    ended_at        DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_call_session_request (request_id),
    KEY idx_call_session_conv (conversation_id),
    KEY idx_call_session_callee (callee_id),
    CONSTRAINT fk_call_session_conv FOREIGN KEY (conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_session_callee FOREIGN KEY (callee_id) REFERENCES app_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 7. notification
-- =============================================================
CREATE TABLE notification (
    id          CHAR(36)        NOT NULL,
    user_id     CHAR(36)        NOT NULL,
    title       VARCHAR(255)    NOT NULL,
    message     VARCHAR(1000)   NOT NULL,
    type        VARCHAR(30)     NOT NULL,
    status      VARCHAR(20)     NOT NULL,
    metadata    VARCHAR(2000)   NULL,
    created_at  DATETIME        NOT NULL,
    read_at     DATETIME        NULL,
    PRIMARY KEY (id),
    KEY idx_notification_user (user_id),
    KEY idx_notification_status (status),
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 8. review
-- =============================================================
CREATE TABLE review (
    id           CHAR(36)        NOT NULL,
    trip_id      CHAR(36)        NOT NULL,
    driver_id    CHAR(36)        NOT NULL,
    customer_id  CHAR(36)        NOT NULL,
    rating       INT             NOT NULL,
    comment      VARCHAR(1000)   NULL,
    created_at   DATETIME        NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_review_trip_customer (trip_id, customer_id),
    KEY idx_review_driver (driver_id),
    KEY idx_review_customer (customer_id),
    CONSTRAINT fk_review_trip FOREIGN KEY (trip_id) REFERENCES trip(id),
    CONSTRAINT fk_review_driver FOREIGN KEY (driver_id) REFERENCES driver_profile(id),
    CONSTRAINT fk_review_customer FOREIGN KEY (customer_id) REFERENCES app_user(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
