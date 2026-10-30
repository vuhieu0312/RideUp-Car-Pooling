package com.rideup.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Trang hiện ra sau khi tài xế thiết lập xong (hoặc link hết hạn) trên Stripe.
 * Công khai (/public/**) vì trình duyệt không mang JWT. Chỉ là trang thông báo, không xử lý dữ liệu.
 */
@RestController
@RequestMapping("/public/connect")
public class ConnectReturnController {

    @GetMapping(value = "/return", produces = "text/html;charset=UTF-8")
    public String done() {
        return page("Hoàn tất",
            "Bạn đã thiết lập xong tài khoản nhận tiền. Hãy quay lại ứng dụng RideUp (Tài xế) và mở lại màn Ví.");
    }

    @GetMapping(value = "/refresh", produces = "text/html;charset=UTF-8")
    public String refresh() {
        return page("Link đã hết hạn",
            "Link thiết lập đã hết hạn. Hãy quay lại ứng dụng RideUp (Tài xế) và bấm \"Thiết lập nhận tiền\" lần nữa.");
    }

    private static String page(String title, String message) {
        return "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\">"
            + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<title>" + title + "</title>"
            + "<style>body{font-family:system-ui,sans-serif;background:#f7faf9;color:#17312c;margin:0;"
            + "display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}"
            + ".c{max-width:360px;text-align:center}h1{font-size:22px;color:#0a9c5a}p{line-height:1.5}</style>"
            + "</head><body><div class=\"c\"><h1>" + title + "</h1><p>" + message + "</p></div></body></html>";
    }
}
