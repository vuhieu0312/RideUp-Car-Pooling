package com.rideup.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Serve file upload trong uploads/ ra ngoài qua URL /uploads/**.
 * FileService lưu file vào app.upload.dir (mặc định uploads/),
 * trả URL tương đối "/uploads/xxx.jpg" để gán vào DB.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + Paths.get(uploadDir).toAbsolutePath() + "/";
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);

        // Bù lại default static locations của Spring Boot
        // (vì override addResourceHandlers() đã vô hiệu hoá mặc định)
        registry.addResourceHandler("/**")
                .addResourceLocations(
                    "classpath:/META-INF/resources/",
                    "classpath:/resources/",
                    "classpath:/static/",
                    "classpath:/public/"
                );
    }
}