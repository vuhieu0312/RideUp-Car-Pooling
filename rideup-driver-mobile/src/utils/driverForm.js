export const GENDERS = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

export const VEHICLE_TYPES = [
  { value: 'CAR', label: 'Ô tô 4 chỗ', short: '4 chỗ', seats: '4' },
  { value: 'SUV', label: 'SUV 7 chỗ', short: '7 chỗ', seats: '7' },
  { value: 'VAN', label: 'Van 16 chỗ', short: '16 chỗ', seats: '16' },
];

export const VEHICLE_STATUS = {
  ACTIVE: { label: 'Đang dùng', icon: 'check-circle-outline', color: '#10b981' },
  PENDING: { label: 'Chờ admin duyệt', icon: 'clock-outline', color: '#f59e0b' },
  REJECTED: { label: 'Bị từ chối', icon: 'close-circle-outline', color: '#dc2626' },
  INACTIVE: { label: 'Đã ngừng dùng', icon: 'pause-circle-outline', color: '#6b7280' },
};

export const vehicleTypeLabel = (value) => VEHICLE_TYPES.find((t) => t.value === value)?.label || value || '';

export const seatsForType = (value) => VEHICLE_TYPES.find((t) => t.value === value)?.seats;

export const normalizePlate = (plate) => (plate || '').toUpperCase().replace(/[-.\s]/g, '');

const PLATE_RE = /^\d{2,3}[A-Z]{1,2}\d{4,5}$/;
const PHONE_RE = /^(0\d{9}|\+84\d{9,10})$/;
const pad = (n) => String(n).padStart(2, '0');

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const formatDate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

export function vehicleToForm(v) {
  return {
    plateNumber: v?.plateNumber || '',
    vehicleBrand: v?.vehicleBrand || '',
    vehicleModel: v?.vehicleModel || '',
    vehicleYear: v?.vehicleYear ? String(v.vehicleYear) : '',
    vehicleColor: v?.vehicleColor || '',
    vehicleType: v?.vehicleType || 'CAR',
    seatCapacity: v?.seatCapacity ? String(v.seatCapacity) : seatsForType(v?.vehicleType || 'CAR'),
    registrationExpiryDate: v?.registrationExpiryDate || '',
  };
}

export function vehiclePayload(form) {
  return {
    plateNumber: normalizePlate(form.plateNumber),
    vehicleBrand: form.vehicleBrand.trim(),
    vehicleModel: form.vehicleModel.trim(),
    vehicleYear: form.vehicleYear,
    vehicleColor: form.vehicleColor.trim(),
    vehicleType: form.vehicleType,
    seatCapacity: form.seatCapacity,
    registrationExpiryDate: form.registrationExpiryDate,
  };
}

export function validateContact(form) {
  if (!form.fullName.trim()) return 'Vui lòng nhập họ tên';
  if (!PHONE_RE.test(form.phone.trim())) return 'Số điện thoại không hợp lệ';
  return '';
}

export function validateAccount(form) {
  if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.password) return 'Vui lòng điền đủ thông tin';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Email không hợp lệ';
  if (form.password.length < 8) return 'Mật khẩu tối thiểu 8 ký tự';
  return validateContact(form);
}

export function validateIdentity(form, images) {
  if (!images.cccdImageFront || !images.cccdImageBack) return 'Vui lòng tải ảnh CCCD 2 mặt';
  if (!/^\d{12}$/.test(form.cccd)) return 'CCCD phải đủ 12 chữ số';
  if (!form.dateOfBirth || form.dateOfBirth >= todayKey()) return 'Vui lòng chọn ngày sinh hợp lệ';
  if (!form.gender) return 'Vui lòng chọn giới tính';
  return '';
}

export function validateLicense(form, images) {
  if (!images.gplxImage) return 'Vui lòng tải ảnh bằng lái xe';
  if (form.gplx.trim().length < 8) return 'Số GPLX tối thiểu 8 ký tự';
  if (!form.gplxExpiryDate) return 'Vui lòng chọn ngày hết hạn GPLX';
  if (form.gplxExpiryDate <= todayKey()) return 'GPLX phải còn hạn sau hôm nay';
  return '';
}

export function validateVehicle(form, images) {
  if (!images.vehicleImage || !images.registrationImage) return 'Vui lòng tải ảnh xe và ảnh giấy đăng ký xe';
  if (!PLATE_RE.test(normalizePlate(form.plateNumber))) return 'Biển số không hợp lệ (vd: 29A-12345)';
  if (!(Number(form.seatCapacity) >= 2)) return 'Số chỗ tối thiểu là 2';
  if (form.vehicleYear && !/^\d{4}$/.test(String(form.vehicleYear))) return 'Năm sản xuất không hợp lệ';
  return '';
}
