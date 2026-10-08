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
--   - display_name: tên đầy đủ
--
-- osmid không bắt buộc → seeder không cần fill vẫn work; queries chỉ cần code/id.
-- Idempotent check: đã có ward với cùng name trong tỉnh thì skip.

USE rideup;

-- ===========================================================================
-- HẢI PHÒNG (code HP) — thành phố trực thuộc TW
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid, display_name)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL, w.display_name
FROM province p
CROSS JOIN (
  SELECT 'Phường Hồng Bàng' AS name, 20.8647 AS lat, 106.6828 AS lng, 'Phường Hồng Bàng, Hải Phòng' AS display_name UNION ALL
  SELECT 'Phường Hoàng Văn Thụ', 20.8608, 106.6742, 'Phường Hoàng Văn Thụ, Hải Phòng' UNION ALL
  SELECT 'Phường Minh Khai', 20.8597, 106.6811, 'Phường Minh Khai, Hải Phòng' UNION ALL
  SELECT 'Phường Phan Bội Châu', 20.8564, 106.6808, 'Phường Phan Bội Châu, Hải Phòng' UNION ALL
  SELECT 'Phường Quán Toan', 20.8842, 106.6419, 'Phường Quán Toan, Hải Phòng' UNION ALL
  SELECT 'Phường Sở Dầu', 20.8739, 106.6553, 'Phường Sở Dầu, Hải Phòng' UNION ALL
  SELECT 'Phường Thượng Lý', 20.8572, 106.6714, 'Phường Thượng Lý, Hải Phòng' UNION ALL
  SELECT 'Phường Trại Chuối', 20.8672, 106.6644, 'Phường Trại Chuối, Hải Phòng' UNION ALL
  SELECT 'Phường Đông Hải', 20.8494, 106.6842, 'Phường Đông Hải, Hải Phòng' UNION ALL

  SELECT 'Phường Cát Dài', 20.8656, 106.6897, 'Phường Cát Dài, Hải Phòng' UNION ALL
  SELECT 'Phường An Biên', 20.8533, 106.6922, 'Phường An Biên, Hải Phòng' UNION ALL
  SELECT 'Phường Lam Sơn', 20.8511, 106.6956, 'Phường Lam Sơn, Hải Phòng' UNION ALL
  SELECT 'Phường Nghĩa Xá', 20.8486, 106.6994, 'Phường Nghĩa Xá, Hải Phòng' UNION ALL
  SELECT 'Phường Trần Nguyên Hãn', 20.8550, 106.6939, 'Phường Trần Nguyên Hãn, Hải Phòng' UNION ALL
  SELECT 'Phường Trần Phú', 20.8569, 106.6978, 'Phường Trần Phú, Hải Phòng' UNION ALL
  SELECT 'Phường Vạn Mỹ', 20.8586, 106.7008, 'Phường Vạn Mỹ, Hải Phòng' UNION ALL
  SELECT 'Phường Cầu Đất', 20.8542, 106.7017, 'Phường Cầu Đất, Hải Phòng' UNION ALL

  SELECT 'Phường Gia Viên', 20.8528, 106.6736, 'Phường Gia Viên, Hải Phòng' UNION ALL
  SELECT 'Phường Lạc Viên', 20.8497, 106.6778, 'Phường Lạc Viên, Hải Phòng' UNION ALL
  SELECT 'Phường Lê Lợi', 20.8464, 106.6819, 'Phường Lê Lợi, Hải Phòng' UNION ALL
  SELECT 'Phường Máy Chai', 20.8442, 106.6856, 'Phường Máy Chai, Hải Phòng' UNION ALL
  SELECT 'Phường Máy Tơ', 20.8450, 106.6794, 'Phường Máy Tơ, Hải Phòng' UNION ALL
  SELECT 'Phường Văn Đẩu', 20.8419, 106.6811, 'Phường Văn Đẩu, Hải Phòng' UNION ALL
  SELECT 'Phường Đằng Giang', 20.8428, 106.6711, 'Phường Đằng Giang, Hải Phòng' UNION ALL

  SELECT 'Phường Đổng Quốc Bình', 20.8467, 106.6686, 'Phường Đổng Quốc Bình, Hải Phòng' UNION ALL

  SELECT 'Phường Cầu Tre', 20.8678, 106.7008, 'Phường Cầu Tre, Hải Phòng' UNION ALL
  SELECT 'Phường Đằng Lâm', 20.8706, 106.6950, 'Phường Đằng Lâm, Hải Phòng' UNION ALL
  SELECT 'Phường Đằng Hải', 20.8719, 106.7036, 'Phường Đằng Hải, Hải Phòng' UNION ALL
  SELECT 'Phường Lương Năng', 20.8747, 106.6983, 'Phường Lương Năng, Hải Phòng' UNION ALL
  SELECT 'Phường Ngọc Hải', 20.8667, 106.7061, 'Phường Ngọc Hải, Hải Phòng' UNION ALL
  SELECT 'Phường Niệm Nghĩa', 20.8661, 106.6919, 'Phường Niệm Nghĩa, Hải Phòng' UNION ALL

  SELECT 'Phường Bắc Sơn', 20.8142, 106.6394, 'Phường Bắc Sơn, Hải Phòng' UNION ALL
  SELECT 'Phường Chùa Hang', 20.8236, 106.6472, 'Phường Chùa Hang, Hải Phòng' UNION ALL
  SELECT 'Phường Đồng Thọ', 20.8228, 106.6525, 'Phường Đồng Thọ, Hải Phòng' UNION ALL
  SELECT 'Phường Hà Khẩu', 20.8306, 106.6444, 'Phường Hà Khẩu, Hải Phòng' UNION ALL
  SELECT 'Phường Hà Lầm', 20.8275, 106.6500, 'Phường Hà Lầm, Hải Phòng' UNION ALL
  SELECT 'Phường Hà Trung', 20.8253, 106.6544, 'Phường Hà Trung, Hải Phòng' UNION ALL
  SELECT 'Phường Phương Độ', 20.8181, 106.6567, 'Phường Phương Độ, Hải Phòng' UNION ALL
  SELECT 'Phường Thanh Lãng', 20.8353, 106.6478, 'Phường Thanh Lãng, Hải Phòng' UNION ALL
  SELECT 'Phường Trường Thọ', 20.8339, 106.6558, 'Phường Trường Thọ, Hải Phòng'
) w
WHERE p.code = 'HP'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- BẮC NINH (code 56) — post-2025: Bắc Ninh + Bắc Giang
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid, display_name)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL, w.display_name
FROM province p
CROSS JOIN (
  SELECT 'Phường Thái Bình' AS name, 21.1714 AS lat, 106.0686 AS lng, 'Phường Thái Bình, Bắc Ninh' AS display_name UNION ALL
  SELECT 'Phường Hạp Lĩnh', 21.1669, 106.0606, 'Phường Hạp Lĩnh, Bắc Ninh' UNION ALL
  SELECT 'Phường Khúc Xuyên', 21.1461, 106.0631, 'Phường Khúc Xuyên, Bắc Ninh' UNION ALL
  SELECT 'Phường Kinh Bắc', 21.1569, 106.0778, 'Phường Kinh Bắc, Bắc Ninh' UNION ALL
  SELECT 'Phường Phong Khê', 21.1392, 106.0867, 'Phường Phong Khê, Bắc Ninh' UNION ALL
  SELECT 'Phường Vệ An', 21.1761, 106.0492, 'Phường Vệ An, Bắc Ninh' UNION ALL
  SELECT 'Phường Võ Cường', 21.1467, 106.0486, 'Phường Võ Cường, Bắc Ninh' UNION ALL
  SELECT 'Phường Vũ Ninh', 21.1575, 106.0944, 'Phường Vũ Ninh, Bắc Ninh' UNION ALL
  SELECT 'Phường Suối Hoa', 21.1672, 106.0786, 'Phường Suối Hoa, Bắc Ninh' UNION ALL
  SELECT 'Phường Tiền Ninh Vệ', 21.1828, 106.0631, 'Phường Tiền Ninh Vệ, Bắc Ninh' UNION ALL

  SELECT 'Phường Đại Phúc', 21.1769, 106.1028, 'Phường Đại Phúc, Bắc Ninh' UNION ALL
  SELECT 'Phường Đình Bảng', 21.0644, 106.0781, 'Phường Đình Bảng, Bắc Ninh (Từ Sơn)' UNION ALL
  SELECT 'Phường Từ Sơn', 21.0731, 106.0856, 'Phường Từ Sơn, Bắc Ninh' UNION ALL
  SELECT 'Phường Phù Chẩn', 21.0581, 106.0942, 'Phường Phù Chẩn, Bắc Ninh' UNION ALL
  SELECT 'Phường Hương Mạc', 21.0825, 106.0786, 'Phường Hương Mạc, Bắc Ninh' UNION ALL

  SELECT 'Xã Yên Phong', 21.1878, 105.9750, 'Xã Yên Phong, Bắc Ninh' UNION ALL
  SELECT 'Xã Tam Giang', 21.0694, 105.9944, 'Xã Tam Giang, Bắc Ninh' UNION ALL
  SELECT 'Xã Yên Trung', 21.1133, 105.9778, 'Xã Yên Trung, Bắc Ninh' UNION ALL
  SELECT 'Xã Tiên Du', 21.1236, 105.9917, 'Xã Tiên Du, Bắc Ninh' UNION ALL
  SELECT 'Xã Lim', 21.1364, 106.0344, 'Xã Lim, Bắc Ninh' UNION ALL
  SELECT 'Xã Gia Bình', 21.0633, 106.2264, 'Xã Gia Bình, Bắc Ninh' UNION ALL
  SELECT 'Xã Lương Tài', 21.0611, 106.1492, 'Xã Lương Tài, Bắc Ninh' UNION ALL
  SELECT 'Xã Thuận Thành', 21.0567, 106.0678, 'Xã Thuận Thành, Bắc Ninh' UNION ALL
  SELECT 'Xã Phật Tích', 21.0486, 106.0586, 'Xã Phật Tích, Bắc Ninh' UNION ALL
  SELECT 'Xã Quế Dương', 21.0772, 106.1383, 'Xã Quế Dương, Bắc Ninh' UNION ALL
  SELECT 'Xã Phong Lăng', 21.0864, 106.1633, 'Xã Phong Lăng, Bắc Ninh' UNION ALL
  SELECT 'Xã Đình Cả', 21.0956, 106.0786, 'Xã Đình Cả, Bắc Ninh' UNION ALL
  SELECT 'Xã Mão Điền', 21.1086, 106.1536, 'Xã Mão Điền, Bắc Ninh' UNION ALL
  SELECT 'Xã Bồ Lý', 21.0789, 105.9533, 'Xã Bồ Lý, Bắc Ninh'
) w
WHERE p.code = '56'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- NINH BÌNH (code 18) — post-2025: Ninh Bình + Hà Nam + Nam Định
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid, display_name)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL, w.display_name
FROM province p
CROSS JOIN (
  SELECT 'Phường Đông Thành' AS name, 20.2539 AS lat, 105.9764 AS lng, 'Phường Đông Thành, Ninh Bình' AS display_name UNION ALL
  SELECT 'Phường Nam Bình', 20.2497, 105.9692, 'Phường Nam Bình, Ninh Bình' UNION ALL
  SELECT 'Phường Bắc Sơn', 20.2567, 105.9719, 'Phường Bắc Sơn, Ninh Bình' UNION ALL
  SELECT 'Phường Tân Thành', 20.2475, 105.9781, 'Phường Tân Thành, Ninh Bình' UNION ALL
  SELECT 'Phường Ninh Khánh', 20.2594, 105.9647, 'Phường Ninh Khánh, Ninh Bình' UNION ALL
  SELECT 'Phường Ninh Phong', 20.2614, 105.9861, 'Phường Ninh Phong, Ninh Bình' UNION ALL
  SELECT 'Phường Ninh Sơn', 20.2531, 105.9947, 'Phường Ninh Sơn, Ninh Bình' UNION ALL

  SELECT 'Phường Trung Sơn', 20.2394, 105.9736, 'Phường Trung Sơn, Ninh Bình' UNION ALL
  SELECT 'Phường Tây Sơn', 20.2442, 105.9569, 'Phường Tây Sơn, Ninh Bình' UNION ALL
  SELECT 'Phường Quang Sơn', 20.2361, 105.9736, 'Phường Quang Sơn, Ninh Bình' UNION ALL
  SELECT 'Phường Yên Bình', 20.2664, 105.9719, 'Phường Yên Bình, Ninh Bình' UNION ALL

  SELECT 'Phường Tam Điệp', 20.1564, 105.8542, 'Phường Tam Điệp, Ninh Bình' UNION ALL
  SELECT 'Phường Bắc Sơn', 20.1506, 105.8639, 'Phường Bắc Sơn, Tam Điệp' UNION ALL
  SELECT 'Phường Nam Sơn', 20.1431, 105.8514, 'Phường Nam Sơn, Tam Điệp' UNION ALL
  SELECT 'Phường Trung Sơn', 20.1492, 105.8583, 'Phường Trung Sơn, Tam Điệp' UNION ALL
  SELECT 'Phường Yên Sơn', 20.1544, 105.8475, 'Phường Yên Sơn, Tam Điệp' UNION ALL

  SELECT 'Xã Hoa Lư', 20.2514, 105.9153, 'Xã Hoa Lư, Ninh Bình' UNION ALL
  SELECT 'Xã Trường Yên', 20.2819, 105.9169, 'Xã Trường Yên, Ninh Bình' UNION ALL
  SELECT 'Xã Gia Sinh', 20.2661, 105.8394, 'Xã Gia Sinh, Ninh Bình' UNION ALL
  SELECT 'Xã Gia Viễn', 20.2444, 105.8639, 'Xã Gia Viễn, Ninh Bình' UNION ALL
  SELECT 'Xã Nho Quan', 20.3036, 105.7525, 'Xã Nho Quan, Ninh Bình' UNION ALL
  SELECT 'Xã Cúc Phương', 20.2450, 105.6397, 'Xã Cúc Phương, Ninh Bình' UNION ALL
  SELECT 'Xã Phát Diệm', 20.1386, 106.0936, 'Xã Phát Diệm, Ninh Bình' UNION ALL
  SELECT 'Xã Kim Sơn', 20.0694, 106.0589, 'Xã Kim Sơn, Ninh Bình' UNION ALL
  SELECT 'Xã Yên Khánh', 20.1936, 106.0031, 'Xã Yên Khánh, Ninh Bình' UNION ALL
  SELECT 'Xã Khánh Thiện', 20.1931, 106.0519, 'Xã Khánh Thiện, Ninh Bình' UNION ALL
  SELECT 'Xã Yên Mô', 20.1497, 105.9642, 'Xã Yên Mô, Ninh Bình' UNION ALL
  SELECT 'Xã Phong Doanh', 20.1603, 105.9525, 'Xã Phong Doanh, Ninh Bình' UNION ALL
  SELECT 'Xã Đồng Thái', 20.1467, 105.9914, 'Xã Đồng Thái, Ninh Bình'
) w
WHERE p.code = '18'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- AN GIANG (code 44) — post-2025: An Giang + Kiên Giang
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid, display_name)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL, w.display_name
FROM province p
CROSS JOIN (
  SELECT 'Phường Long Xuyên' AS name, 10.3883 AS lat, 105.4364 AS lng, 'Phường Long Xuyên, An Giang' AS display_name UNION ALL
  SELECT 'Phường Mỹ Bình', 10.3850, 105.4431, 'Phường Mỹ Bình, An Giang' UNION ALL
  SELECT 'Phường Mỹ Hòa', 10.3819, 105.4297, 'Phường Mỹ Hòa, An Giang' UNION ALL
  SELECT 'Phường Mỹ Long', 10.3781, 105.4511, 'Phường Mỹ Long, An Giang' UNION ALL
  SELECT 'Phường Bình Khánh', 10.3900, 105.4494, 'Phường Bình Khánh, An Giang' UNION ALL
  SELECT 'Phường Mỹ Xuyên', 10.3936, 105.4219, 'Phường Mỹ Xuyên, An Giang' UNION ALL
  SELECT 'Phường Mỹ Phước', 10.3958, 105.4311, 'Phường Mỹ Phước, An Giang' UNION ALL
  SELECT 'Phường Bình Đức', 10.4006, 105.4511, 'Phường Bình Đức, An Giang' UNION ALL

  SELECT 'Phường Châu Đốc', 10.7014, 105.1158, 'Phường Châu Đốc, An Giang' UNION ALL
  SELECT 'Phường Vĩnh Mỹ', 10.6950, 105.1236, 'Phường Vĩnh Mỹ, An Giang' UNION ALL
  SELECT 'Phường Núi Sam', 10.6836, 105.1150, 'Phường Núi Sam, An Giang' UNION ALL
  SELECT 'Phường Châu Phú A', 10.7056, 105.1236, 'Phường Châu Phú A, An Giang' UNION ALL
  SELECT 'Phường Châu Phú B', 10.6986, 105.1311, 'Phường Châu Phú B, An Giang' UNION ALL

  SELECT 'Phường Long Châu', 10.3622, 105.4117, 'Phường Long Châu, An Giang' UNION ALL
  SELECT 'Phường Long Hưng', 10.3631, 105.4197, 'Phường Long Hưng, An Giang' UNION ALL
  SELECT 'Phường Long Phú', 10.3581, 105.4033, 'Phường Long Phú, An Giang' UNION ALL
  SELECT 'Phường Long Sơn', 10.3500, 105.4083, 'Phường Long Sơn, An Giang' UNION ALL
  SELECT 'Phường Long Thạnh', 10.3586, 105.4297, 'Phường Long Thạnh, An Giang' UNION ALL

  SELECT 'Xã Chợ Mới', 10.5486, 105.4733, 'Xã Chợ Mới, An Giang' UNION ALL
  SELECT 'Xã Long Điền A', 10.5514, 105.4567, 'Xã Long Điền A, An Giang' UNION ALL
  SELECT 'Xã Long Điền B', 10.5419, 105.4625, 'Xã Long Điền B, An Giang' UNION ALL
  SELECT 'Xã Hội An', 10.5236, 105.4883, 'Xã Hội An, An Giang' UNION ALL
  SELECT 'Xã Long Kiến', 10.5172, 105.4631, 'Xã Long Kiến, An Giang' UNION ALL
  SELECT 'Xã Mỹ Hiệp', 10.4619, 105.5269, 'Xã Mỹ Hiệp, An Giang' UNION ALL
  SELECT 'Xã Nhơn Mỹ', 10.4550, 105.5544, 'Xã Nhơn Mỹ, An Giang' UNION ALL
  SELECT 'Xã Phú Hiệp', 10.5619, 105.4397, 'Xã Phú Hiệp, An Giang' UNION ALL

  SELECT 'Xã Tri Tôn', 10.4136, 105.0006, 'Xã Tri Tôn, An Giang' UNION ALL
  SELECT 'Xã Núi Tô', 10.4436, 105.0250, 'Xã Núi Tô, An Giang' UNION ALL
  SELECT 'Xã An Tức', 10.4211, 105.0336, 'Xã An Tức, An Giang' UNION ALL
  SELECT 'Xã Tà Đảnh', 10.4350, 105.0600, 'Xã Tà Đảnh, An Giang' UNION ALL
  SELECT 'Xã Óc Eo', 10.2494, 105.0250, 'Xã Óc Eo, An Giang' UNION ALL
  SELECT 'Xã Thoại Sơn', 10.2906, 105.0836, 'Xã Thoại Sơn, An Giang' UNION ALL
  SELECT 'Xã Vĩnh Trạch', 10.3697, 105.0114, 'Xã Vĩnh Trạch, An Giang' UNION ALL
  SELECT 'Xã Vĩnh Phú', 10.3383, 105.0483, 'Xã Vĩnh Phú, An Giang'
) w
WHERE p.code = '44'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- THÁI NGUYÊN (code 69) — post-2025: giữ nguyên
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid, display_name)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL, w.display_name
FROM province p
CROSS JOIN (
  SELECT 'Phường Thái Nguyên' AS name, 21.5611 AS lat, 105.8719 AS lng, 'Phường Thái Nguyên, Thái Nguyên' AS display_name UNION ALL
  SELECT 'Phường Quang Trung', 21.5728, 105.8497, 'Phường Quang Trung, Thái Nguyên' UNION ALL
  SELECT 'Phường Trưng Vương', 21.5633, 105.8583, 'Phường Trưng Vương, Thái Nguyên' UNION ALL
  SELECT 'Phường Hoàng Văn Thụ', 21.5508, 105.8614, 'Phường Hoàng Văn Thụ, Thái Nguyên' UNION ALL
  SELECT 'Phường Đồng Quang', 21.5786, 105.8689, 'Phường Đồng Quang, Thái Nguyên' UNION ALL
  SELECT 'Phường Tân Thịnh', 21.5667, 105.8861, 'Phường Tân Thịnh, Thái Nguyên' UNION ALL
  SELECT 'Phường Gia Sàng', 21.5867, 105.8475, 'Phường Gia Sàng, Thái Nguyên' UNION ALL
  SELECT 'Phường Tân Lập', 21.5553, 105.8839, 'Phường Tân Lập, Thái Nguyên' UNION ALL
  SELECT 'Phường Phú Xá', 21.5819, 105.8786, 'Phường Phú Xá, Thái Nguyên' UNION ALL
  SELECT 'Phường Cam Giá', 21.6067, 105.8614, 'Phường Cam Giá, Thái Nguyên' UNION ALL
  SELECT 'Phường Hương Sơn', 21.5869, 105.8603, 'Phường Hương Sơn, Thái Nguyên' UNION ALL
  SELECT 'Phường Trung Thành', 21.5817, 105.8922, 'Phường Trung Thành, Thái Nguyên' UNION ALL
  SELECT 'Phường Tân Long', 21.5714, 105.9103, 'Phường Tân Long, Thái Nguyên' UNION ALL

  SELECT 'Phường Sông Công', 21.4769, 105.8528, 'Phường Sông Công, Thái Nguyên' UNION ALL
  SELECT 'Phường Thắng Lợi', 21.4853, 105.8631, 'Phường Thắng Lợi, Sông Công' UNION ALL
  SELECT 'Phường Phố Cò', 21.4692, 105.8769, 'Phường Phố Cò, Sông Công' UNION ALL
  SELECT 'Phường Bách Quang', 21.4817, 105.8428, 'Phường Bách Quang, Sông Công' UNION ALL
  SELECT 'Phường Cải Đan', 21.4964, 105.8550, 'Phường Cải Đan, Sông Công' UNION ALL
  SELECT 'Phường Lương Sơn', 21.4661, 105.8403, 'Phường Lương Sơn, Sông Công' UNION ALL

  SELECT 'Xã Đại Từ', 21.6639, 105.6419, 'Xã Đại Từ, Thái Nguyên' UNION ALL
  SELECT 'Xã Phú Lương', 21.4944, 105.7308, 'Xã Phú Lương, Thái Nguyên' UNION ALL
  SELECT 'Xã Đông Hỷ', 21.6489, 105.7239, 'Xã Đông Hỷ, Thái Nguyên' UNION ALL
  SELECT 'Xã Võ Nhai', 21.7839, 105.8014, 'Xã Võ Nhai, Thái Nguyên' UNION ALL
  SELECT 'Xã Định Hóa', 21.7789, 105.5903, 'Xã Định Hóa, Thái Nguyên' UNION ALL
  SELECT 'Xã Phú Bình', 21.4664, 105.9503, 'Xã Phú Bình, Thái Nguyên' UNION ALL
  SELECT 'Xã Tân Khánh', 21.4611, 106.0011, 'Xã Tân Khánh, Thái Nguyên' UNION ALL
  SELECT 'Xã Bàn Cờ', 21.4839, 105.9919, 'Xã Bàn Cờ, Thái Nguyên' UNION ALL
  SELECT 'Xã Phục Linh', 21.4653, 105.9786, 'Xã Phục Linh, Thái Nguyên' UNION ALL
  SELECT 'Xã Tân Kim', 21.4889, 105.9644, 'Xã Tân Kim, Thái Nguyên' UNION ALL
  SELECT 'Xã La Bằng', 21.4719, 105.9689, 'Xã La Bằng, Thái Nguyên' UNION ALL
  SELECT 'Xã Úc Kỳ', 21.4808, 105.9914, 'Xã Úc Kỳ, Thái Nguyên'
) w
WHERE p.code = '69'
  AND NOT EXISTS (
    SELECT 1 FROM ward existing
    WHERE existing.province_id = p.id AND existing.name = w.name
  );

-- ===========================================================================
-- THANH HOÁ (code 21) — post-2025: giữ nguyên (tỉnh lớn, >100 wards)
-- ===========================================================================
INSERT INTO ward (id, province_id, name, lat, lng, osmid, display_name)
SELECT UUID(), p.id, w.name, w.lat, w.lng, NULL, w.display_name
FROM province p
CROSS JOIN (
  SELECT 'Phường Đông Thọ' AS name, 19.8042 AS lat, 105.7756 AS lng, 'Phường Đông Thọ, Thanh Hoá' AS display_name UNION ALL
  SELECT 'Phường Lam Sơn', 19.8042, 105.7756, 'Phường Lam Sơn, Thanh Hoá' UNION ALL
  SELECT 'Phường Ba Đình', 19.8097, 105.7814, 'Phường Ba Đình, Thanh Hoá' UNION ALL
  SELECT 'Phường Ngọc Trạo', 19.8017, 105.7694, 'Phường Ngọc Trạo, Thanh Hoá' UNION ALL
  SELECT 'Phường Tân Sơn', 19.7967, 105.7883, 'Phường Tân Sơn, Thanh Hoá' UNION ALL
  SELECT 'Phường Trường Thi', 19.8122, 105.7633, 'Phường Trường Thi, Thanh Hoá' UNION ALL
  SELECT 'Phường Phú Sơn', 19.8206, 105.7686, 'Phường Phú Sơn, Thanh Hoá' UNION ALL
  SELECT 'Phường Hàm Rồng', 19.8233, 105.7764, 'Phường Hàm Rồng, Thanh Hoá' UNION ALL
  SELECT 'Phường Quảng Thắng', 19.8236, 105.7917, 'Phường Quảng Thắng, Thanh Hoá' UNION ALL
  SELECT 'Phường Quảng Thành', 19.8369, 105.7811, 'Phường Quảng Thành, Thanh Hoá' UNION ALL
  SELECT 'Phường Điện Biên', 19.8244, 105.7500, 'Phường Điện Biên, Thanh Hoá' UNION ALL
  SELECT 'Phường Đông Hương', 19.8086, 105.7489, 'Phường Đông Hương, Thanh Hoá' UNION ALL
  SELECT 'Phường Đông Sơn', 19.7961, 105.7539, 'Phường Đông Sơn, Thanh Hoá' UNION ALL
  SELECT 'Phường Tào Xuyên', 19.8203, 105.7336, 'Phường Tào Xuyên, Thanh Hoá' UNION ALL
  SELECT 'Phường An Hưng', 19.8111, 105.7350, 'Phường An Hưng, Thanh Hoá' UNION ALL

  SELECT 'Phường Bỉm Sơn', 20.0786, 105.8625, 'Phường Bỉm Sơn, Thanh Hoá' UNION ALL
  SELECT 'Phường Quang Trung', 20.0814, 105.8725, 'Phường Quang Trung, Bỉm Sơn' UNION ALL
  SELECT 'Phường Ba Đình', 20.0736, 105.8675, 'Phường Ba Đình, Bỉm Sơn' UNION ALL
  SELECT 'Phường Ngọc Trạo', 20.0761, 105.8764, 'Phường Ngọc Trạo, Bỉm Sơn' UNION ALL
  SELECT 'Phường Lam Sơn', 20.0836, 105.8528, 'Phường Lam Sơn, Bỉm Sơn' UNION ALL
  SELECT 'Phường Đông Sơn', 20.0692, 105.8536, 'Phường Đông Sơn, Bỉm Sơn' UNION ALL
  SELECT 'Phường Phú Sơn', 20.0772, 105.8878, 'Phường Phú Sơn, Bỉm Sơn' UNION ALL

  SELECT 'Phường Sầm Sơn', 19.7389, 105.8981, 'Phường Sầm Sơn, Thanh Hoá' UNION ALL
  SELECT 'Phường Trung Sơn', 19.7425, 105.8933, 'Phường Trung Sơn, Sầm Sơn' UNION ALL
  SELECT 'Phường Bắc Sơn', 19.7511, 105.9056, 'Phường Bắc Sơn, Sầm Sơn' UNION ALL
  SELECT 'Phường Trường Sơn', 19.7453, 105.9017, 'Phường Trường Sơn, Sầm Sơn' UNION ALL

  SELECT 'Xã Đông Sơn', 19.7839, 105.7100, 'Xã Đông Sơn, Thanh Hoá' UNION ALL
  SELECT 'Xã Quảng Xương', 19.7000, 105.7825, 'Xã Quảng Xương, Thanh Hoá' UNION ALL
  SELECT 'Xã Nga Sơn', 20.0017, 105.9731, 'Xã Nga Sơn, Thanh Hoá' UNION ALL
  SELECT 'Xã Hậu Lộc', 19.9319, 105.8958, 'Xã Hậu Lộc, Thanh Hoá' UNION ALL
  SELECT 'Xã Hà Trung', 20.0853, 105.7833, 'Xã Hà Trung, Thanh Hoá' UNION ALL
  SELECT 'Xã Hoằng Hóa', 19.8236, 105.8553, 'Xã Hoằng Hóa, Thanh Hoá' UNION ALL
  SELECT 'Xã Hoằng Phú', 19.7933, 105.8867, 'Xã Hoằng Phú, Thanh Hoá' UNION ALL
  SELECT 'Xã Thiệu Hóa', 19.9017, 105.7464, 'Xã Thiệu Hóa, Thanh Hoá' UNION ALL
  SELECT 'Xã Triệu Sơn', 19.7961, 105.6614, 'Xã Triệu Sơn, Thanh Hoá' UNION ALL
  SELECT 'Xã Nông Cống', 19.6236, 105.6461, 'Xã Nông Cống, Thanh Hoá' UNION ALL
  SELECT 'Xã Đông Thọ', 19.7144, 105.6053, 'Xã Đông Thọ, Thanh Hoá' UNION ALL
  SELECT 'Xã Yên Định', 19.9933, 105.5972, 'Xã Yên Định, Thanh Hoá' UNION ALL
  SELECT 'Xã Thọ Xuân', 19.9292, 105.5214, 'Xã Thọ Xuân, Thanh Hoá' UNION ALL
  SELECT 'Xã Lam Sơn', 19.9064, 105.5461, 'Xã Lam Sơn, Thanh Hoá' UNION ALL
  SELECT 'Xã Cẩm Thủy', 20.2053, 105.4619, 'Xã Cẩm Thủy, Thanh Hoá' UNION ALL
  SELECT 'Xã Vĩnh Lộc', 20.0544, 105.6583, 'Xã Vĩnh Lộc, Thanh Hoá' UNION ALL
  SELECT 'Xã Hàm Yên', 20.1364, 105.6400, 'Xã Hàm Yên, Thanh Hoá' UNION ALL
  SELECT 'Xã Ngọc Lặc', 20.0922, 105.3736, 'Xã Ngọc Lặc, Thanh Hoá' UNION ALL
  SELECT 'Xã Lang Chánh', 20.1508, 105.2364, 'Xã Lang Chánh, Thanh Hoá' UNION ALL
  SELECT 'Xã Quan Hóa', 20.4883, 104.9889, 'Xã Quan Hóa, Thanh Hoá' UNION ALL
  SELECT 'Xã Quan Sơn', 20.2606, 104.8764, 'Xã Quan Sơn, Thanh Hoá' UNION ALL
  SELECT 'Xã Bá Thước', 20.3617, 105.2333, 'Xã Bá Thước, Thanh Hoá' UNION ALL
  SELECT 'Xã Mường Lát', 20.4931, 105.1344, 'Xã Mường Lát, Thanh Hoá'
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
