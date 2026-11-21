import { useState } from 'react';
import BarChart from '../../components/BarChart';
import { CardGrid, EmptyState, Panel, RankList, Segmented, SectionTitle, StatCard, StatGrid } from '../../components/ui';
import { accent } from '../../theme';
import { fmtNumber, fmtVnd } from '../../utils/format';

const VIEWS = [
  { value: 'summary', label: 'Tổng quan' },
  { value: 'revenue', label: 'Doanh thu' },
  { value: 'people', label: 'Người dùng' },
];

const PERIODS = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

const vndFull = (value) => `${fmtNumber(value)} đ`;

export default function OverviewTab({ dashboard, period, onPeriodChange }) {
  const [view, setView] = useState('summary');

  if (!dashboard) return <EmptyState icon="cloud-off-outline" text="Chưa tải được dữ liệu" />;

  const trips = dashboard.trips || {};
  const drivers = dashboard.drivers || {};
  const customers = dashboard.customers || {};
  const tripTimeline = trips.timeline || [];
  const revenueTimeline = dashboard.revenue?.timeline || [];
  const completedRate = trips.total ? Math.round(((trips.completed || 0) / trips.total) * 100) : 0;

  const periodSelector = <Segmented options={PERIODS} value={period} onChange={onPeriodChange} />;

  return (
    <>
      <Segmented options={VIEWS} value={view} onChange={setView} />

      {view === 'summary' && (
        <>
          <StatGrid>
            <StatCard icon="cash-multiple" label="Doanh thu" value={fmtVnd(dashboard.totalRevenue)} color={accent.green} />
            <StatCard icon="percent" label="Phí nền tảng" value={fmtVnd(dashboard.platformFee)} color={accent.amber} />
            <StatCard icon="car-multiple" label="Chuyến đi" value={fmtNumber(dashboard.totalTrips)} color={accent.violet} sub={`${trips.completed || 0} hoàn thành`} />
            <StatCard icon="account-group" label="Người dùng" value={fmtNumber(dashboard.totalUsers)} color={accent.blue} />
          </StatGrid>
          {periodSelector}
          <CardGrid>
            <Panel>
              <SectionTitle>Doanh thu</SectionTitle>
              <BarChart period={period} data={revenueTimeline} color={accent.green} formatValue={vndFull} />
            </Panel>
            <Panel>
              <SectionTitle>Số chuyến</SectionTitle>
              <BarChart period={period} data={tripTimeline} color={accent.violet} />
            </Panel>
          </CardGrid>
        </>
      )}

      {view === 'revenue' && (
        <>
          <StatGrid>
            <StatCard icon="routes" label="Tổng chuyến" value={fmtNumber(trips.total)} color={accent.blue} />
            <StatCard icon="check-circle-outline" label="Hoàn thành" value={fmtNumber(trips.completed)} color={accent.green} sub={`${completedRate}%`} />
            <StatCard icon="close-circle-outline" label="Đã huỷ" value={fmtNumber(trips.canceled)} color={accent.red} />
            <StatCard icon="percent" label="Phí nền tảng" value={fmtVnd(dashboard.revenue?.platformFee)} color={accent.amber} />
          </StatGrid>
          {periodSelector}
          <CardGrid>
            <Panel>
              <SectionTitle>Doanh thu</SectionTitle>
              <BarChart period={period} data={revenueTimeline} color={accent.green} formatValue={vndFull} />
            </Panel>
            <Panel>
              <SectionTitle>Doanh thu theo tài xế</SectionTitle>
              <RankList
                rows={(dashboard.revenue?.byDriver || []).map((row) => ({ key: row.id || row.name, name: row.name, value: row.value }))}
                renderValue={(row) => fmtVnd(row.value)}
                emptyText="Chưa có doanh thu"
              />
            </Panel>
          </CardGrid>
        </>
      )}

      {view === 'people' && (
        <>
          <StatGrid>
            <StatCard icon="steering" label="Tài xế" value={fmtNumber(drivers.total)} color={accent.blue} sub={`${drivers.newDrivers || 0} mới`} />
            <StatCard icon="account-check-outline" label="Tài xế hoạt động" value={fmtNumber(drivers.activeDrivers)} color={accent.green} />
            <StatCard icon="account-outline" label="Khách hàng" value={fmtNumber(customers.total)} color={accent.violet} sub={`${customers.newCustomers || 0} mới`} />
            <StatCard icon="account-check-outline" label="Khách hoạt động" value={fmtNumber(customers.activeCustomers)} color={accent.cyan} />
          </StatGrid>
          <CardGrid>
            <Panel>
              <SectionTitle>Top tài xế hoạt động</SectionTitle>
              <RankList
                rows={(drivers.topActive || []).map((row) => ({ key: row.id || row.name, name: row.name, trips: row.trips }))}
                renderValue={(row) => `${row.trips} chuyến`}
                emptyText="Chưa có dữ liệu"
              />
            </Panel>
            <Panel>
              <SectionTitle>Top khách đặt chuyến</SectionTitle>
              <RankList
                rows={(customers.topCustomers || []).map((row) => ({ key: row.id || row.name, name: row.name, trips: row.trips }))}
                renderValue={(row) => `${row.trips} chuyến`}
                emptyText="Chưa có dữ liệu"
              />
            </Panel>
          </CardGrid>
        </>
      )}
    </>
  );
}
