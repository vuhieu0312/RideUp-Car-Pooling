-- Add account violation tracking and report moderation.
ALTER TABLE app_user
    ADD COLUMN violation_count INT NOT NULL DEFAULT 0,
    ADD COLUMN account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

CREATE TABLE report (
    id VARCHAR(36) NOT NULL,
    reporter_id VARCHAR(36) NOT NULL,
    reported_user_id VARCHAR(36) NOT NULL,
    booking_id VARCHAR(36) NOT NULL,
    category VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    evidence_url VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    handled_by VARCHAR(36) NULL,
    handled_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_report_reporter_booking_user
        UNIQUE (reporter_id, booking_id, reported_user_id),
    CONSTRAINT fk_report_reporter
        FOREIGN KEY (reporter_id) REFERENCES app_user (id),
    CONSTRAINT fk_report_reported_user
        FOREIGN KEY (reported_user_id) REFERENCES app_user (id),
    CONSTRAINT fk_report_booking
        FOREIGN KEY (booking_id) REFERENCES booking (id),
    CONSTRAINT fk_report_handled_by
        FOREIGN KEY (handled_by) REFERENCES app_user (id),
    INDEX idx_report_status_created (status, created_at),
    INDEX idx_report_reported_user (reported_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
