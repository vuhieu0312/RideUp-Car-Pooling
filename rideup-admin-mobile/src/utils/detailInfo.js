import { fmtDate, fmtDateTime } from './format';
import { DRIVER_STATUS, GENDER, label, VEHICLE_STATUS, VEHICLE_TYPE } from './labels';

function reviewHistory(item, reviewerName) {
  if (item.approvedAt) return `Duyệt bởi ${reviewerName || 'admin'} lúc ${fmtDateTime(item.approvedAt)}`;
  if (item.rejectedAt && item.status === 'PENDING') return `Gửi lại sau khi bị từ chối lúc ${fmtDateTime(item.rejectedAt)}: ${item.rejectionReason || ''}`;
  if (item.rejectedAt) return `Từ chối lúc ${fmtDateTime(item.rejectedAt)}: ${item.rejectionReason || ''}`;
  if (item.rejectionReason) return `Lần trước bị từ chối: ${item.rejectionReason}`;
  return 'Chưa xử lý';
}

export function buildDetailInfo(detail) {
  if (!detail) return { title: '', rows: [], images: [] };
  const x = detail.item;
  if (detail.type === 'driver') {
    const d = detail.data?.driver || x;
    const v = detail.data?.vehicle;
    const sections = [
      {
        title: 'Tài khoản',
        rows: [
          ['Họ tên', d.fullName], ['Email', d.email], ['Số điện thoại', d.phone],
          ['Ngày sinh', fmtDate(d.dateOfBirth)], ['Giới tính', label(GENDER, d.gender)],
          ['Ngày tạo tài khoản', fmtDate(detail.data?.accountCreatedAt)],
        ],
      },
      {
        title: 'Giấy tờ',
        rows: [
          ['CCCD', d.cccd], ['GPLX', d.gplx], ['Hạn GPLX', fmtDate(d.gplxExpiryDate)],
          ['Trạng thái', label(DRIVER_STATUS, d.status)], ['Ngày nộp hồ sơ', fmtDate(d.createdAt)],
          ['Lịch sử duyệt', reviewHistory(d, detail.data?.driverReviewedByName)],
        ],
      },
      {
        title: 'Phương tiện',
        rows: v ? [
          ['Biển số', v.plateNumber], ['Hãng / dòng', [v.vehicleBrand, v.vehicleModel].filter(Boolean).join(' ')],
          ['Năm sản xuất', v.vehicleYear], ['Màu sắc', v.vehicleColor], ['Loại xe', label(VEHICLE_TYPE, v.vehicleType)],
          ['Số chỗ', v.seatCapacity], ['Hạn đăng kiểm', fmtDate(v.registrationExpiryDate)],
          ['Trạng thái xe', label(VEHICLE_STATUS, v.status)],
          ['Lịch sử duyệt xe', reviewHistory(v, detail.data?.vehicleReviewedByName)],
        ] : [['Phương tiện', 'Chưa đăng ký']],
      },
    ];
    const allVehicles = detail.data?.vehicles || [];
    if (allVehicles.length > 1) {
      sections.push({
        title: 'Lịch sử xe',
        rows: allVehicles.map((item) => [item.plateNumber, `${label(VEHICLE_STATUS, item.status)} · đăng ký ${fmtDate(item.createdAt)}`]),
      });
    }
    const imageGroups = [
      {
        title: 'Giấy tờ tài xế',
        images: [
          { label: 'CCCD mặt trước', path: d.cccdImageFront },
          { label: 'CCCD mặt sau', path: d.cccdImageBack },
          { label: 'Giấy phép lái xe', path: d.gplxImage },
        ],
      },
    ];
    if (v) {
      imageGroups.push({
        title: 'Phương tiện',
        images: [
          { label: 'Ảnh xe', path: v.vehicleImage },
          { label: 'Giấy đăng ký xe', path: v.registrationImage },
        ],
      });
    }
    return {
      title: 'Hồ sơ tài xế',
      sections,
      imageGroups,
      warnings: detail.data?.warnings || [],
    };
  }
  return {
    title: 'Hồ sơ phương tiện',
    rows: [
      ['Biển số', x.plateNumber], ['Tài xế', x.driverName], ['SĐT tài xế', x.driverPhone], ['Hãng xe', x.vehicleBrand],
      ['Dòng xe', x.vehicleModel], ['Năm sản xuất', x.vehicleYear], ['Màu sắc', x.vehicleColor],
      ['Loại xe', label(VEHICLE_TYPE, x.vehicleType)], ['Số chỗ', x.seatCapacity],
      ['Hạn đăng kiểm', fmtDate(x.registrationExpiryDate)],
      ['Ngày đăng ký', fmtDate(x.createdAt)],
    ],
    images: [
      { label: 'Ảnh xe', path: x.vehicleImage },
      { label: 'Giấy đăng ký xe', path: x.registrationImage },
    ],
  };
}
