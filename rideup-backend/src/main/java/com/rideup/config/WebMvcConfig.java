package com.rideup.config;

import com.rideup.security.DocumentAccessInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir}")
    private String uploadDir;

    private final DocumentAccessInterceptor documentAccessInterceptor;

    public WebMvcConfig(DocumentAccessInterceptor documentAccessInterceptor) {
        this.documentAccessInterceptor = documentAccessInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(documentAccessInterceptor).addPathPatterns("/uploads/**");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + Paths.get(uploadDir).toAbsolutePath() + "/";
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);

        // giữ lại static location mặc định của Spring Boot (do đã override addResourceHandlers)
        registry.addResourceHandler("/**")
                .addResourceLocations(
                    "classpath:/META-INF/resources/",
                    "classpath:/resources/",
                    "classpath:/static/",
                    "classpath:/public/"
                );
    }
}