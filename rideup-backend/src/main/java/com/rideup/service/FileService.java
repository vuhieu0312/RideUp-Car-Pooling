package com.rideup.service;

import com.rideup.exception.AppException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

/**
 * Lưu file upload vào thư mục cấu hình (mặc định uploads/).
 * Trả về URL tương đối (/uploads/xxx.jpg) để gán vào các cột VARCHAR(500) của DriverProfile.
 * WebMvcConfig ánh xạ /uploads/** → file:{uploadDir}/.
 */
@Service
@Slf4j
public class FileService {

    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_TYPES = Set.of(
        "image/jpeg", "image/png", "image/webp"
    );

    private final String uploadDir;

    public FileService(@Value("${app.upload.dir}") String uploadDir) {
        this.uploadDir = uploadDir;
    }

    /**
     * Upload fileảnh vào thư mục uploads/.
     *
     * @param file   MultipartFile từ request
     * @param prefix tiền tố để phân biệt folder logic (cccd, gplx...)
     * @return URL tương đối kiểu "/uploads/cccd-uuid.jpg"
     */
    public String upload(MultipartFile file, String prefix) {
        validate(file);
        String ext = extensionOf(file.getContentType());
        String filename = prefix + "-" + UUID.randomUUID() + "." + ext;
        Path target = Paths.get(uploadDir, filename);

        try {
            Files.createDirectories(target.getParent());
            Files.write(target, file.getBytes());
            log.info("Saved upload to {}", target.toAbsolutePath());
            return "/uploads/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Không thể lưu file: " + e.getMessage(), e);
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw AppException.badRequest("File ảnh không được trống");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw AppException.badRequest("File ảnh vượt quá 5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw AppException.badRequest("Chỉ chấp nhận ảnh JPEG/PNG/WebP");
        }
    }

    private String extensionOf(String contentType) {
        return switch (contentType.toLowerCase()) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "bin";
        };
    }
}