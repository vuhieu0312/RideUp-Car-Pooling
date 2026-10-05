package com.rideup.service;

import com.rideup.exception.AppException;
import com.rideup.dto.request.CreateReviewRequest;
import com.rideup.dto.response.ReviewResponse;
import com.rideup.entity.Booking;
import com.rideup.entity.DriverProfile;
import com.rideup.entity.Review;
import com.rideup.entity.Trip;
import com.rideup.entity.User;
import com.rideup.enums.BookingStatus;
import com.rideup.enums.TripStatus;
import com.rideup.repository.BookingRepository;
import com.rideup.repository.DriverProfileRepository;
import com.rideup.repository.ReviewRepository;
import com.rideup.repository.TripRepository;
import com.rideup.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Đánh giá tài xế sau chuyến đi.
 *
 * <p>Luồng xử lý:</p>
 * <ol>
 *   <li>Validate trip COMPLETED + customer đã booking trip</li>
 *   <li>Lưu Review record</li>
 *   <li>Cập nhật driverRating = trung bình cộng dồn + tăng totalDriverRides</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReviewService {

    ReviewRepository reviewRepository;
    TripRepository tripRepository;
    BookingRepository bookingRepository;
    UserRepository userRepository;
    DriverProfileRepository driverProfileRepository;

    @Transactional
    public ReviewResponse createReview(String userId, String tripId, CreateReviewRequest req) {
        User customer = userRepository.findById(userId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy khách hàng"));

        Trip trip = tripRepository.findById(tripId)
            .orElseThrow(() -> AppException.notFound("Không tìm thấy chuyến"));

        if (trip.getStatus() != TripStatus.COMPLETED) {
            throw AppException.badRequest("Chỉ đánh giá được chuyến đã hoàn thành");
        }

        boolean hasBooked = bookingRepository.existsByCustomerIdAndTripIdAndStatusIn(
            userId, tripId,
            List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.COMPLETED)
        );
        if (!hasBooked) {
            throw AppException.forbidden("Bạn không có booking cho chuyến này");
        }

        if (reviewRepository.existsByTripIdAndCustomerId(tripId, userId)) {
            throw AppException.conflict("Bạn đã đánh giá chuyến này rồi");
        }

        User driver = trip.getDriver();
        DriverProfile profile = driverProfileRepository.findByUserId(driver.getId())
            .orElseThrow(() -> AppException.notFound("Tài xế chưa có hồ sơ"));

        Review review = Review.builder()
            .trip(trip)
            .driver(driver)
            .customer(customer)
            .rating(req.getRating())
            .comment(req.getComment())
            .build();
        review = reviewRepository.save(review);

        // Cập nhật driver rating: newAvg = (oldAvg * count + newRating) / (count + 1)
        BigDecimal currentAvg = profile.getDriverRating();
        long count = profile.getTotalDriverRides();
        BigDecimal newRating = currentAvg
            .multiply(BigDecimal.valueOf(count))
            .add(BigDecimal.valueOf(req.getRating()))
            .divide(BigDecimal.valueOf(count + 1), 2, RoundingMode.HALF_UP);

        profile.setDriverRating(newRating);
        profile.setTotalDriverRides(profile.getTotalDriverRides() + 1);
        driverProfileRepository.save(profile);

        log.info("Review created id={} trip={} driver={} rating={} newAvg={}",
            review.getId(), tripId, driver.getId(), req.getRating(), newRating);

        return toResponse(review);
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> listDriverReviews(String driverId) {
        return reviewRepository.findByDriverIdOrderByCreatedAtDesc(driverId).stream()
            .map(this::toResponse)
            .toList();
    }

    private ReviewResponse toResponse(Review r) {
        return ReviewResponse.builder()
            .id(r.getId())
            .tripId(r.getTrip().getId())
            .driverId(r.getDriver().getId())
            .driverName(r.getDriver().getFullName())
            .customerId(r.getCustomer().getId())
            .customerName(r.getCustomer().getFullName())
            .rating(r.getRating())
            .comment(r.getComment())
            .createdAt(r.getCreatedAt())
            .build();
    }
}