-- RideUp: Insert wards cho 6 tỉnh thiếu (HP, 56, 18, 44, 69, 21).
-- Cách dùng:
--   1. Mở MySQL: mysql -u root -proot rideup
--   2. Source file: source /path/to/insert-missing-wards.sql;
--   3. Verify:     SELECT p.code, COUNT(w.id) FROM province p LEFT JOIN ward w ON w.province_id=p.id GROUP BY p.code;
--
-- Mỗi ward có:
--   - id: tự sinh (MySQL UUID())
--   - province_id: lookup từ code (HP, 56, 18, 44, 69, 21)
--   - name: tên phường/xã
--   - lat/lng: centroid (xấp xỉ)
--   - osmid: NULL (sẽ fill sau nếu muốn)
--
-- osmid không bắt buộc → seeder không cần fill vẫn work; queries chỉ cần code/id.
-- Idempotent check: đã có ward với cùng name trong tỉnh thì skip.

USE rideup;

-- ===========================================================================
-- HẢI PHÒNG (code HP) — thành phố trực thuộc TW
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL
FROM province p
CROSS JOIN (
  SELECT 'Phường Hồng Bàng' AS name, 20.8647 AS lat, 106.6828 AS lng UNION ALL
  SELECT 'Phường Hoàng Văn Thụ', 20.8608, 106.6742 UNION ALL
  SELECT 'Phường Minh Khai', 20.8597, 106.6811 UNION ALL
  SELECT 'Phường Phan Bội Châu', 20.8564, 106.6808 UNION ALL
  SELECT 'Phường Quán Toan', 20.8842, 106.6419 UNION ALL
  SELECT 'Phường Sở Dầu', 20.8739, 106.6553 UNION ALL
  SELECT 'Phường Thượng Lý', 20.8572, 106.6714 UNION ALL
  SELECT 'Phường Trại Chuối', 20.8672, 106.6644 UNION ALL
  SELECT 'Phường Đông Hải', 20.8494, 106.6842 UNION ALL

  SELECT 'Phường Cát Dài', 20.8656, 106.6897 UNION ALL
  SELECT 'Phường An Biên', 20.8533, 106.6922 UNION ALL
  SELECT 'Phường Lam Sơn', 20.8511, 106.6956 UNION ALL
  SELECT 'Phường Nghĩa Xá', 20.8486, 106.6994 UNION ALL
  SELECT 'Phường Trần Nguyên Hãn', 20.8550, 106.6939 UNION ALL
  SELECT 'Phường Trần Phú', 20.8569, 106.6978 UNION ALL
  SELECT 'Phường Vạn Mỹ', 20.8586, 106.7008 UNION ALL
  SELECT 'Phường Cầu Đất', 20.8542, 106.7017 UNION ALL

  SELECT 'Phường Gia Viên', 20.8528, 106.6736 UNION ALL
  SELECT 'Phường Lạc Viên', 20.8497, 106.6778 UNION ALL
  SELECT 'Phường Lê Lợi', 20.8464, 106.6819 UNION ALL
  SELECT 'Phường Máy Chai', 20.8442, 106.6856 UNION ALL
  SELECT 'Phường Máy Tơ', 20.8450, 106.6794 UNION ALL
  SELECT 'Phường Văn Đẩu', 20.8419, 106.6811 UNION ALL
  SELECT 'Phường Đằng Giang', 20.8428, 106.6711 UNION ALL

  SELECT 'Phường Đổng Quốc Bình', 20.8467, 106.6686 UNION ALL

  SELECT 'Phường Cầu Tre', 20.8678, 106.7008 UNION ALL
  SELECT 'Phường Đằng Lâm', 20.8706, 106.6950 UNION ALL
  SELECT 'Phường Đằng Hải', 20.8719, 106.7036 UNION ALL
  SELECT 'Phường Lương Năng', 20.8747, 106.6983 UNION ALL
  SELECT 'Phường Ngọc Hải', 20.8667, 106.7061 UNION ALL
  SELECT 'Phường Niệm Nghĩa', 20.8661, 106.6919 UNION ALL

  SELECT 'Phường Bắc Sơn', 20.8142, 106.6394 UNION ALL
  SELECT 'Phường Chùa Hang', 20.8236, 106.6472 UNION ALL
  SELECT 'Phường Đồng Thọ', 20.8228, 106.6525 UNION ALL
  SELECT 'Phường Hà Khẩu', 20.8306, 106.6444 UNION ALL
  SELECT 'Phường Hà Lầm', 20.8275, 106.6500 UNION ALL
  SELECT 'Phường Hà Trung', 20.8253, 106.6544 UNION ALL
  SELECT 'Phường Phương Độ', 20.8181, 106.6567 UNION ALL
  SELECT 'Phường Thanh Lãng', 20.8353, 106.6478 UNION ALL
  SELECT 'Phường Trường Thọ', 20.8339, 106.6558
) w
WHERE p.code = 'HP'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- BẮC NINH (code 56) — post-2025: Bắc Ninh + Bắc Giang
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL
FROM province p
CROSS JOIN (
  SELECT 'Phường Thái Bình' AS name, 21.1714 AS lat, 106.0686 AS lng UNION ALL
  SELECT 'Phường Hạp Lĩnh', 21.1669, 106.0606 UNION ALL
  SELECT 'Phường Khúc Xuyên', 21.1461, 106.0631 UNION ALL
  SELECT 'Phường Kinh Bắc', 21.1569, 106.0778 UNION ALL
  SELECT 'Phường Phong Khê', 21.1392, 106.0867 UNION ALL
  SELECT 'Phường Vệ An', 21.1761, 106.0492 UNION ALL
  SELECT 'Phường Võ Cường', 21.1467, 106.0486 UNION ALL
  SELECT 'Phường Vũ Ninh', 21.1575, 106.0944 UNION ALL
  SELECT 'Phường Suối Hoa', 21.1672, 106.0786 UNION ALL
  SELECT 'Phường Tiền Ninh Vệ', 21.1828, 106.0631 UNION ALL

  SELECT 'Phường Đại Phúc', 21.1769, 106.1028 UNION ALL
  SELECT 'Phường Đình Bảng', 21.0644, 106.0781 UNION ALL
  SELECT 'Phường Từ Sơn', 21.0731, 106.0856 UNION ALL
  SELECT 'Phường Phù Chẩn', 21.0581, 106.0942 UNION ALL
  SELECT 'Phường Hương Mạc', 21.0825, 106.0786 UNION ALL

  SELECT 'Xã Yên Phong', 21.1878, 105.9750 UNION ALL
  SELECT 'Xã Tam Giang', 21.0694, 105.9944 UNION ALL
  SELECT 'Xã Yên Trung', 21.1133, 105.9778 UNION ALL
  SELECT 'Xã Tiên Du', 21.1236, 105.9917 UNION ALL
  SELECT 'Xã Lim', 21.1364, 106.0344 UNION ALL
  SELECT 'Xã Gia Bình', 21.0633, 106.2264 UNION ALL
  SELECT 'Xã Lương Tài', 21.0611, 106.1492 UNION ALL
  SELECT 'Xã Thuận Thành', 21.0567, 106.0678 UNION ALL
  SELECT 'Xã Phật Tích', 21.0486, 106.0586 UNION ALL
  SELECT 'Xã Quế Dương', 21.0772, 106.1383 UNION ALL
  SELECT 'Xã Phong Lăng', 21.0864, 106.1633 UNION ALL
  SELECT 'Xã Đình Cả', 21.0956, 106.0786 UNION ALL
  SELECT 'Xã Mão Điền', 21.1086, 106.1536 UNION ALL
  SELECT 'Xã Bồ Lý', 21.0789, 105.9533
) w
WHERE p.code = '56'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- NINH BÌNH (code 18) — post-2025: Ninh Bình + Hà Nam + Nam Định
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL
FROM province p
CROSS JOIN (
  SELECT 'Phường Đông Thành' AS name, 20.2539 AS lat, 105.9764 AS lng UNION ALL
  SELECT 'Phường Nam Bình', 20.2497, 105.9692 UNION ALL
  SELECT 'Phường Bắc Sơn', 20.2567, 105.9719 UNION ALL
  SELECT 'Phường Tân Thành', 20.2475, 105.9781 UNION ALL
  SELECT 'Phường Ninh Khánh', 20.2594, 105.9647 UNION ALL
  SELECT 'Phường Ninh Phong', 20.2614, 105.9861 UNION ALL
  SELECT 'Phường Ninh Sơn', 20.2531, 105.9947 UNION ALL

  SELECT 'Phường Trung Sơn', 20.2394, 105.9736 UNION ALL
  SELECT 'Phường Tây Sơn', 20.2442, 105.9569 UNION ALL
  SELECT 'Phường Quang Sơn', 20.2361, 105.9736 UNION ALL
  SELECT 'Phường Yên Bình', 20.2664, 105.9719 UNION ALL

  SELECT 'Phường Tam Điệp', 20.1564, 105.8542 UNION ALL
  SELECT 'Phường Bắc Sơn', 20.1506, 105.8639 UNION ALL
  SELECT 'Phường Nam Sơn', 20.1431, 105.8514 UNION ALL
  SELECT 'Phường Trung Sơn', 20.1492, 105.8583 UNION ALL
  SELECT 'Phường Yên Sơn', 20.1544, 105.8475 UNION ALL

  SELECT 'Xã Hoa Lư', 20.2514, 105.9153 UNION ALL
  SELECT 'Xã Trường Yên', 20.2819, 105.9169 UNION ALL
  SELECT 'Xã Gia Sinh', 20.2661, 105.8394 UNION ALL
  SELECT 'Xã Gia Viễn', 20.2444, 105.8639 UNION ALL
  SELECT 'Xã Nho Quan', 20.3036, 105.7525 UNION ALL
  SELECT 'Xã Cúc Phương', 20.2450, 105.6397 UNION ALL
  SELECT 'Xã Phát Diệm', 20.1386, 106.0936 UNION ALL
  SELECT 'Xã Kim Sơn', 20.0694, 106.0589 UNION ALL
  SELECT 'Xã Yên Khánh', 20.1936, 106.0031 UNION ALL
  SELECT 'Xã Khánh Thiện', 20.1931, 106.0519 UNION ALL
  SELECT 'Xã Yên Mô', 20.1497, 105.9642 UNION ALL
  SELECT 'Xã Phong Doanh', 20.1603, 105.9525 UNION ALL
  SELECT 'Xã Đồng Thái', 20.1467, 105.9914
) w
WHERE p.code = '18'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- AN GIANG (code 44) — post-2025: An Giang + Kiên Giang
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL
FROM province p
CROSS JOIN (
  SELECT 'Phường Long Xuyên' AS name, 10.3883 AS lat, 105.4364 AS lng UNION ALL
  SELECT 'Phường Mỹ Bình', 10.3850, 105.4431 UNION ALL
  SELECT 'Phường Mỹ Hòa', 10.3819, 105.4297 UNION ALL
  SELECT 'Phường Mỹ Long', 10.3781, 105.4511 UNION ALL
  SELECT 'Phường Bình Khánh', 10.3900, 105.4494 UNION ALL
  SELECT 'Phường Mỹ Xuyên', 10.3936, 105.4219 UNION ALL
  SELECT 'Phường Mỹ Phước', 10.3958, 105.4311 UNION ALL
  SELECT 'Phường Bình Đức', 10.4006, 105.4511 UNION ALL

  SELECT 'Phường Châu Đốc', 10.7014, 105.1158 UNION ALL
  SELECT 'Phường Vĩnh Mỹ', 10.6950, 105.1236 UNION ALL
  SELECT 'Phường Núi Sam', 10.6836, 105.1150 UNION ALL
  SELECT 'Phường Châu Phú A', 10.7056, 105.1236 UNION ALL
  SELECT 'Phường Châu Phú B', 10.6986, 105.1311 UNION ALL

  SELECT 'Phường Long Châu', 10.3622, 105.4117 UNION ALL
  SELECT 'Phường Long Hưng', 10.3631, 105.4197 UNION ALL
  SELECT 'Phường Long Phú', 10.3581, 105.4033 UNION ALL
  SELECT 'Phường Long Sơn', 10.3500, 105.4083 UNION ALL
  SELECT 'Phường Long Thạnh', 10.3586, 105.4297 UNION ALL

  SELECT 'Xã Chợ Mới', 10.5486, 105.4733 UNION ALL
  SELECT 'Xã Long Điền A', 10.5514, 105.4567 UNION ALL
  SELECT 'Xã Long Điền B', 10.5419, 105.4625 UNION ALL
  SELECT 'Xã Hội An', 10.5236, 105.4883 UNION ALL
  SELECT 'Xã Long Kiến', 10.5172, 105.4631 UNION ALL
  SELECT 'Xã Mỹ Hiệp', 10.4619, 105.5269 UNION ALL
  SELECT 'Xã Nhơn Mỹ', 10.4550, 105.5544 UNION ALL
  SELECT 'Xã Phú Hiệp', 10.5619, 105.4397 UNION ALL

  SELECT 'Xã Tri Tôn', 10.4136, 105.0006 UNION ALL
  SELECT 'Xã Núi Tô', 10.4436, 105.0250 UNION ALL
  SELECT 'Xã An Tức', 10.4211, 105.0336 UNION ALL
  SELECT 'Xã Tà Đảnh', 10.4350, 105.0600 UNION ALL
  SELECT 'Xã Óc Eo', 10.2494, 105.0250 UNION ALL
  SELECT 'Xã Thoại Sơn', 10.2906, 105.0836 UNION ALL
  SELECT 'Xã Vĩnh Trạch', 10.3697, 105.0114 UNION ALL
  SELECT 'Xã Vĩnh Phú', 10.3383, 105.0483
) w
WHERE p.code = '44'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- THÁI NGUYÊN (code 69) — post-2025: giữ nguyên
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL
FROM province p
CROSS JOIN (
  SELECT 'Phường Thái Nguyên' AS name, 21.5611 AS lat, 105.8719 AS lng UNION ALL
  SELECT 'Phường Quang Trung', 21.5728, 105.8497 UNION ALL
  SELECT 'Phường Trưng Vương', 21.5633, 105.8583 UNION ALL
  SELECT 'Phường Hoàng Văn Thụ', 21.5508, 105.8614 UNION ALL
  SELECT 'Phường Đồng Quang', 21.5786, 105.8689 UNION ALL
  SELECT 'Phường Tân Thịnh', 21.5667, 105.8861 UNION ALL
  SELECT 'Phường Gia Sàng', 21.5867, 105.8475 UNION ALL
  SELECT 'Phường Tân Lập', 21.5553, 105.8839 UNION ALL
  SELECT 'Phường Phú Xá', 21.5819, 105.8786 UNION ALL
  SELECT 'Phường Cam Giá', 21.6067, 105.8614 UNION ALL
  SELECT 'Phường Hương Sơn', 21.5869, 105.8603 UNION ALL
  SELECT 'Phường Trung Thành', 21.5817, 105.8922 UNION ALL
  SELECT 'Phường Tân Long', 21.5714, 105.9103 UNION ALL

  SELECT 'Phường Sông Công', 21.4769, 105.8528 UNION ALL
  SELECT 'Phường Thắng Lợi', 21.4853, 105.8631 UNION ALL
  SELECT 'Phường Phố Cò', 21.4692, 105.8769 UNION ALL
  SELECT 'Phường Bách Quang', 21.4817, 105.8428 UNION ALL
  SELECT 'Phường Cải Đan', 21.4964, 105.8550 UNION ALL
  SELECT 'Phường Lương Sơn', 21.4661, 105.8403 UNION ALL

  SELECT 'Xã Đại Từ', 21.6639, 105.6419 UNION ALL
  SELECT 'Xã Phú Lương', 21.4944, 105.7308 UNION ALL
  SELECT 'Xã Đông Hỷ', 21.6489, 105.7239 UNION ALL
  SELECT 'Xã Võ Nhai', 21.7839, 105.8014 UNION ALL
  SELECT 'Xã Định Hóa', 21.7789, 105.5903 UNION ALL
  SELECT 'Xã Phú Bình', 21.4664, 105.9503 UNION ALL
  SELECT 'Xã Tân Khánh', 21.4611, 106.0011 UNION ALL
  SELECT 'Xã Bàn Cờ', 21.4839, 105.9919 UNION ALL
  SELECT 'Xã Phục Linh', 21.4653, 105.9786 UNION ALL
  SELECT 'Xã Tân Kim', 21.4889, 105.9644 UNION ALL
  SELECT 'Xã La Bằng', 21.4719, 105.9689 UNION ALL
  SELECT 'Xã Úc Kỳ', 21.4808, 105.9914
) w
WHERE p.code = '69'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- THANH HOÁ (code 21) — post-2025: giữ nguyên (tỉnh lớn, >100 wards)
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL
FROM province p
CROSS JOIN (
  SELECT 'Phường Đông Thọ' AS name, 19.8042 AS lat, 105.7756 AS lng UNION ALL
  SELECT 'Phường Lam Sơn', 19.8042, 105.7756 UNION ALL
  SELECT 'Phường Ba Đình', 19.8097, 105.7814 UNION ALL
  SELECT 'Phường Ngọc Trạo', 19.8017, 105.7694 UNION ALL
  SELECT 'Phường Tân Sơn', 19.7967, 105.7883 UNION ALL
  SELECT 'Phường Trường Thi', 19.8122, 105.7633 UNION ALL
  SELECT 'Phường Phú Sơn', 19.8206, 105.7686 UNION ALL
  SELECT 'Phường Hàm Rồng', 19.8233, 105.7764 UNION ALL
  SELECT 'Phường Quảng Thắng', 19.8236, 105.7917 UNION ALL
  SELECT 'Phường Quảng Thành', 19.8369, 105.7811 UNION ALL
  SELECT 'Phường Điện Biên', 19.8244, 105.7500 UNION ALL
  SELECT 'Phường Đông Hương', 19.8086, 105.7489 UNION ALL
  SELECT 'Phường Đông Sơn', 19.7961, 105.7539 UNION ALL
  SELECT 'Phường Tào Xuyên', 19.8203, 105.7336 UNION ALL
  SELECT 'Phường An Hưng', 19.8111, 105.7350 UNION ALL

  SELECT 'Phường Bỉm Sơn', 20.0786, 105.8625 UNION ALL
  SELECT 'Phường Quang Trung', 20.0814, 105.8725 UNION ALL
  SELECT 'Phường Ba Đình', 20.0736, 105.8675 UNION ALL
  SELECT 'Phường Ngọc Trạo', 20.0761, 105.8764 UNION ALL
  SELECT 'Phường Lam Sơn', 20.0836, 105.8528 UNION ALL
  SELECT 'Phường Đông Sơn', 20.0692, 105.8536 UNION ALL
  SELECT 'Phường Phú Sơn', 20.0772, 105.8878 UNION ALL

  SELECT 'Phường Sầm Sơn', 19.7389, 105.8981 UNION ALL
  SELECT 'Phường Trung Sơn', 19.7425, 105.8933 UNION ALL
  SELECT 'Phường Bắc Sơn', 19.7511, 105.9056 UNION ALL
  SELECT 'Phường Trường Sơn', 19.7453, 105.9017 UNION ALL

  SELECT 'Xã Đông Sơn', 19.7839, 105.7100 UNION ALL
  SELECT 'Xã Quảng Xương', 19.7000, 105.7825 UNION ALL
  SELECT 'Xã Nga Sơn', 20.0017, 105.9731 UNION ALL
  SELECT 'Xã Hậu Lộc', 19.9319, 105.8958 UNION ALL
  SELECT 'Xã Hà Trung', 20.0853, 105.7833 UNION ALL
  SELECT 'Xã Hoằng Hóa', 19.8236, 105.8553 UNION ALL
  SELECT 'Xã Hoằng Phú', 19.7933, 105.8867 UNION ALL
  SELECT 'Xã Thiệu Hóa', 19.9017, 105.7464 UNION ALL
  SELECT 'Xã Triệu Sơn', 19.7961, 105.6614 UNION ALL
  SELECT 'Xã Nông Cống', 19.6236, 105.6461 UNION ALL
  SELECT 'Xã Đông Thọ', 19.7144, 105.6053 UNION ALL
  SELECT 'Xã Yên Định', 19.9933, 105.5972 UNION ALL
  SELECT 'Xã Thọ Xuân', 19.9292, 105.5214 UNION ALL
  SELECT 'Xã Lam Sơn', 19.9064, 105.5461 UNION ALL
  SELECT 'Xã Cẩm Thủy', 20.2053, 105.4619 UNION ALL
  SELECT 'Xã Vĩnh Lộc', 20.0544, 105.6583 UNION ALL
  SELECT 'Xã Hàm Yên', 20.1364, 105.6400 UNION ALL
  SELECT 'Xã Ngọc Lặc', 20.0922, 105.3736 UNION ALL
  SELECT 'Xã Lang Chánh', 20.1508, 105.2364 UNION ALL
  SELECT 'Xã Quan Hóa', 20.4883, 104.9889 UNION ALL
  SELECT 'Xã Quan Sơn', 20.2606, 104.8764 UNION ALL
  SELECT 'Xã Bá Thước', 20.3617, 105.2333 UNION ALL
  SELECT 'Xã Mường Lát', 20.4931, 105.1344
) w
WHERE p.code = '21'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- Verify kết quả
-- ===========================================================================
SELECT
  p.code,
  p.name,
  COUNT(w.id) AS ward_count
FROM province p
LEFT JOIN ward w ON w.province_id = p.id
WHERE p.code IN ('HP', '56', '18', '44', '69', '21')
GROUP BY p.code, p.name
ORDER BY p.code;
