package com.rideup.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.util.HtmlUtils;

import java.util.concurrent.CompletableFuture;

/** Gửi mail thông báo cho tài xế. Lỗi gửi mail chỉ ghi log, không ảnh hưởng nghiệp vụ. */
@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from:}")
    private String from;

    public void sendDriverApproved(String to, String name) {
        String body = "<p>Hồ sơ tài xế của bạn đã được <b>duyệt</b>.</p>"
            + "<p>Bạn có thể đăng ký phương tiện và tạo chuyến đi trên RideUp.</p>";
        queue(to, "RideUp - Hồ sơ tài xế đã được duyệt", name, body);
    }

    public void sendDriverRejected(String to, String name, String reason) {
        String body = "<p>Hồ sơ tài xế của bạn <b>chưa được duyệt</b>.</p>"
            + "<p>Lý do: " + esc(reason) + "</p>"
            + "<p>Vui lòng cập nhật lại hồ sơ và gửi lại.</p>";
        queue(to, "RideUp - Hồ sơ tài xế bị từ chối", name, body);
    }

    public void sendVehicleApproved(String to, String name, String plate) {
        String body = "<p>Xe biển số <b>" + esc(plate) + "</b> đã được <b>duyệt</b>.</p>"
            + "<p>Bạn có thể tạo chuyến đi với xe này.</p>";
        queue(to, "RideUp - Phương tiện đã được duyệt", name, body);
    }

    public void sendVehicleRejected(String to, String name, String plate, String reason) {
        String body = "<p>Xe biển số <b>" + esc(plate) + "</b> <b>chưa được duyệt</b>.</p>"
            + "<p>Lý do: " + esc(reason) + "</p>"
            + "<p>Vui lòng cập nhật lại thông tin xe và gửi lại.</p>";
        queue(to, "RideUp - Phương tiện bị từ chối", name, body);
    }

    /** Đưa mail vào hàng đợi: chờ transaction commit xong (nếu có) rồi gửi ở luồng riêng. */
    private void queue(String to, String subject, String name, String body) {
        if (to == null || to.isBlank()) {
            return;
        }
        String html = "<div style=\"font-family:Arial,sans-serif;font-size:15px;color:#222\">"
            + "<p>Xin chào <b>" + esc(name) + "</b>,</p>" + body
            + "<p>Trân trọng,<br>Đội ngũ RideUp</p></div>";
        Runnable task = () -> CompletableFuture.runAsync(() -> send(to, subject, html));

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private void send(String to, String subject, String html) {
        if (!enabled) {
            log.info("[MAIL tắt] to={} subject={}", to, subject);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            if (from != null && !from.isBlank()) {
                helper.setFrom(from);
            }
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Đã gửi mail to={} subject={}", to, subject);
        } catch (Exception e) {
            log.error("Gửi mail thất bại to={} subject={}", to, subject, e);
        }
    }

    private String esc(String s) {
        return s == null ? "" : HtmlUtils.htmlEscape(s);
    }
}
