export const DRIVER_STATUS = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
};

export const VEHICLE_STATUS = {
  PENDING: 'Chờ duyệt',
  ACTIVE: 'Đang dùng',
  INACTIVE: 'Đã ngừng dùng',
  REJECTED: 'Bị từ chối',
};

export const VEHICLE_TYPE = {
  CAR: 'Ô tô 4 chỗ',
  SUV: 'SUV 7 chỗ',
  VAN: 'Van 16 chỗ',
};

export const GENDER = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
};

export const label = (map, value) => map[value] || value;
