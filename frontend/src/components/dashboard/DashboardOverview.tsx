import { useEffect, useMemo, useState } from 'react';
import type { AdminMetrics, TransactionStats } from '../../lib/domain-types';

interface DashboardOverviewProps {
  statsLoading: boolean;
  statsData: TransactionStats | null;
  isAdmin: boolean;
  adminMetrics: AdminMetrics | null;
  monthlyActivityRows: Array<[string, number]>;
  formatMoney: (amount: number | string, currency?: string) => string;
  compactNumber: (value: number) => string;
  localeTag: string;
  timezone: string;
}

function formatTickLabel(value: string, localeTag: string, timezone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    return new Intl.DateTimeFormat(localeTag, {
      day: '2-digit',
      month: '2-digit',
      timeZone: timezone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat(localeTag, { day: '2-digit', month: '2-digit' }).format(date);
  }
}

export function DashboardOverview({
  statsLoading,
  statsData,
  isAdmin,
  adminMetrics,
  monthlyActivityRows,
  formatMoney,
  compactNumber,
  localeTag,
  timezone,
}: DashboardOverviewProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const timeParts = useMemo(() => {
    try {
      return {
        time: new Intl.DateTimeFormat(localeTag, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: timezone,
        }).format(now),
        zone: timezone.replace('_', ' '),
      };
    } catch {
      return { time: now.toLocaleTimeString('lv-LV'), zone: timezone };
    }
  }, [localeTag, now, timezone]);

  const inflow = statsData?.totals.inflow ?? 0;
  const outflow = statsData?.totals.outflow ?? 0;
  const net = statsData?.totals.net ?? 0;
  const totalTransactions = statsData
    ? Object.values(statsData.transactions_by_status).reduce((sum, value) => sum + value, 0)
    : 0;
  const completedTransactions = statsData?.transactions_by_status.completed ?? 0;
  const completionRate = totalTransactions > 0 ? Math.round((completedTransactions / totalTransactions) * 100) : 0;
  const netToneClass = net > 0 ? 'text-emerald-700' : net < 0 ? 'text-rose-700' : 'text-bank-ink';

  const chartWidth = 760;
  const chartHeight = 250;
  const padding = { top: 24, right: 88, bottom: 42, left: 88 };
  const hasChartData = monthlyActivityRows.length > 0;
  const chartValues = monthlyActivityRows.map(([, value]) => value);
  const maxValue = hasChartData ? Math.max(...chartValues, 1) : 1;
  const minValue = 0;
  const range = Math.max(maxValue - minValue, 1);
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const chartPoints = monthlyActivityRows.map(([label, value], index) => {
    const x =
      monthlyActivityRows.length === 1
        ? chartWidth / 2
        : padding.left + (index / (monthlyActivityRows.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - ((value - minValue) / range) * innerHeight;

    return { label, value, x, y };
  });

  const linePath = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath =
    chartPoints.length > 0
      ? `M ${chartPoints[0].x} ${padding.top + innerHeight} L ${chartPoints
          .map((point) => `${point.x} ${point.y}`)
          .join(' L ')} L ${chartPoints[chartPoints.length - 1].x} ${padding.top + innerHeight} Z`
      : '';

  const pendingApprovals = isAdmin
    ? adminMetrics?.approvals.pending ?? statsData?.transactions_by_status.pending ?? 0
    : statsData?.transactions_by_status.pending ?? 0;
  const failedTransactions = statsData?.transactions_by_status.failed ?? 0;
  const rejectedTransactions = statsData?.transactions_by_status.rejected ?? 0;
  const activeIssues = failedTransactions + rejectedTransactions;

  return (
    <section className="rounded-2xl bg-white px-5 py-5 shadow-[0_1px_0_rgba(24,42,68,0.08)] sm:px-6">
      <header className="border-b border-bank-border/60 pb-3">
        <h2 className="text-xl font-semibold text-bank-ink">Sākums</h2>
      </header>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-bank-border bg-bank-panel-soft/35 px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bank-muted">Ienākošais apjoms</dt>
          <dd className="mt-1.5 text-lg font-semibold text-bank-cosmic">{statsLoading ? '...' : formatMoney(inflow)}</dd>
        </div>
        <div className="rounded-xl border border-bank-border bg-bank-panel-soft/35 px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bank-muted">Izejošais apjoms</dt>
          <dd className="mt-1.5 text-lg font-semibold text-bank-ink">{statsLoading ? '...' : formatMoney(outflow)}</dd>
        </div>
        <div className="rounded-xl border border-bank-border bg-bank-panel-soft/35 px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bank-muted">Neto rezultāts</dt>
          <dd className={`mt-1.5 text-lg font-semibold ${netToneClass}`}>{statsLoading ? '...' : formatMoney(net)}</dd>
        </div>
        <div className="rounded-xl border border-bank-border bg-bank-panel-soft/35 px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bank-muted">Pabeigti darījumi</dt>
          <dd className="mt-1.5 text-lg font-semibold text-bank-ink">{statsLoading ? '...' : `${completionRate}%`}</dd>
        </div>
      </dl>

      <div className="mt-3 grid gap-4 xl:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-bank-border bg-bank-panel-soft/30 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-bank-muted">Darījumu aktivitāte</h3>
            <span className="text-xs font-semibold text-bank-muted">Skatāms pēdējiem 1 mēnešiem</span>
          </div>

          {!hasChartData ? (
            <p className="rounded-xl bg-white px-3 py-3 text-sm text-bank-muted">Nav pieejamu aktivitātes datu grafikam.</p>
          ) : (
            <div className="rounded-xl border border-bank-border bg-white p-2 sm:p-3">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-[220px] w-full sm:h-[238px]" role="img" aria-label="Darījumu aktivitātes grafiks">
                <defs>
                  <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2b5fd9" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2b5fd9" stopOpacity="0.04" />
                  </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((step) => {
                  const y = padding.top + step * innerHeight;
                  return <line key={step} x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#d8dfeb" strokeDasharray="4 6" />;
                })}
                <path d={areaPath} fill="url(#activity-area)" />
                <polyline fill="none" stroke="#2b5fd9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePath} />
                {chartPoints.map((point, index) => {
                  const showLabel = chartPoints.length <= 4 || index === 0 || index === chartPoints.length - 1 || index % 2 === 0;
                  return (
                    <g key={`${point.label}-${index}`}>
                      <circle cx={point.x} cy={point.y} r="5.5" fill="#2b5fd9" />
                      {showLabel && (
                        <>
                          <text x={point.x} y={padding.top + innerHeight + 20} textAnchor="middle" className="fill-bank-muted text-[15px] font-medium">
                            {formatTickLabel(point.label, localeTag, timezone)}
                          </text>
                          <text x={point.x} y={padding.top + innerHeight + 40} textAnchor="middle" className="fill-bank-ink text-[15px] font-bold">
                            {formatMoney(point.value)}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </section>

        <aside className="h-full">
          <section className="flex h-full min-h-[332px] flex-col rounded-xl border border-bank-border bg-white px-4 py-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bank-muted">Praktiskie rādītāji</h3>
            <div className="mt-2 flex min-h-[148px] flex-col items-center justify-center rounded-xl border border-bank-border bg-bank-panel-soft/50 px-3 py-4 text-center">
              <p className="text-[2.4rem] font-semibold leading-none tabular-nums text-bank-cosmic sm:text-[3rem] xl:text-[2.55rem]">{timeParts.time}</p>
              <p className="mt-2 max-w-full truncate text-[0.85rem] font-semibold uppercase tracking-[0.14em] text-bank-muted">{timeParts.zone}</p>
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                <dt className="leading-5 text-bank-muted">Darījumi sarakstā</dt>
                <dd className="font-semibold text-bank-ink">{statsLoading ? '...' : compactNumber(totalTransactions)}</dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                <dt className="leading-5 text-bank-muted">Gaidoši apstiprinājumi</dt>
                <dd className="font-semibold text-bank-ink">{statsLoading ? '...' : compactNumber(pendingApprovals)}</dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                <dt className="leading-5 text-bank-muted">Aktīvās problēmas</dt>
                <dd className={`font-semibold ${activeIssues > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{activeIssues}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </section>
  );
}
