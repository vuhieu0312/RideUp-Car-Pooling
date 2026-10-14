import { createElement } from 'react';
import { View } from 'react-native';
import { buildBookingMapHtml } from './bookingMapHtml';

/** Bản đồ điểm đón/trả — web: nhúng bằng iframe. */
export default function BookingMap({ pickup, dropoff, height = 170 }) {
  if (!pickup && !dropoff) return null;
  return (
    <View style={{ height, borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
      {createElement('iframe', {
        srcDoc: buildBookingMapHtml(pickup, dropoff),
        style: { border: 0, width: '100%', height: '100%' },
        title: 'Bản đồ điểm đón và điểm trả',
      })}
    </View>
  );
}
