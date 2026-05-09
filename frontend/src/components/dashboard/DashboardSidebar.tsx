import type { DashboardView } from '../../lib/domain-types';

interface SidebarStatusSummary {
  pendingApprovals: number;
  pendingUsers: number;
  openIssues: number;
  totalTransactions: number;
  completedTransactions: number;
}

interface DashboardSidebarProps {
  activeView: DashboardView;
  isAdmin: boolean;
  onViewChange: (view: DashboardView) => void;
  profileSetupLocked: boolean;
  accountPendingApproval?: boolean;
  accountBlocked?: boolean;
  statusSummary: SidebarStatusSummary;
}

export function DashboardSidebar({
  activeView,
  isAdmin,
  onViewChange,
  profileSetupLocked,
  accountPendingApproval,
  accountBlocked,
  statusSummary,
}: DashboardSidebarProps) {
  const navItems: Array<{ key: DashboardView; title: string }> = [
    { key: 'overview', title: 'Sākums' },
    { key: 'accounts', title: 'Konti' },
    { key: 'transactions', title: 'Maksājumi' },
    { key: 'settings', title: 'Iestatījumi' },
  ];

  if (isAdmin) {
    navItems.push({ key: 'admin', title: 'Administrācija' });
  }

  const completionRate =
    statusSummary.totalTransactions > 0
      ? Math.round((statusSummary.completedTransactions / statusSummary.totalTransactions) * 100)
      : 0;
  const completionTone =
    completionRate >= 90 ? 'text-emerald-700' : completionRate >= 70 ? 'text-amber-700' : 'text-rose-700';
  const queueLabel =
    statusSummary.pendingApprovals > 12
      ? 'Pārpildīta'
      : statusSummary.pendingApprovals > 4
        ? 'Aktīva'
        : 'Normāla';
  const queueTone =
    statusSummary.pendingApprovals > 12
      ? 'text-rose-700'
      : statusSummary.pendingApprovals > 4
        ? 'text-amber-700'
        : 'text-emerald-700';
  const issueTone =
    statusSummary.openIssues > 2 ? 'text-rose-700' : statusSummary.openIssues > 0 ? 'text-amber-700' : 'text-emerald-700';

  return (
    <aside className="lg:sticky lg:top-20 lg:self-start">
      <div className="space-y-3 rounded-xl bg-white p-3 shadow-[0_1px_0_rgba(24,42,68,0.08)]">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = activeView === item.key;
            const isLocked = (profileSetupLocked || accountPendingApproval || accountBlocked) && item.key !== 'settings';

            return (
              <button
                key={item.key}
                onClick={() => onViewChange(item.key)}
                disabled={isLocked}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm transition ${
                  isLocked
                    ? 'cursor-not-allowed text-bank-muted/60'
                    : ''
                } ${
                  isActive
                    ? 'bg-bank-panel-soft font-semibold text-bank-ink'
                    : 'text-bank-muted hover:bg-bank-panel-soft/65 hover:text-bank-ink'
                }`}
              >
                <span
                  className={`absolute left-0 top-1.5 h-[calc(100%-12px)] w-[2px] rounded-r ${
                    isActive ? 'bg-bank-cosmic' : 'bg-transparent group-hover:bg-bank-border'
                  }`}
                />

                <span className={`block ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.title}</span>
              </button>
            );
          })}
        </nav>

        <article className="rounded-lg border border-bank-border bg-bank-panel-soft/55 px-3 py-2.5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-bank-muted">Sistēmas statuss</p>
          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-bank-muted">Apstiprinājumu rinda</dt>
              <dd className={`font-semibold ${queueTone}`}>{queueLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-bank-muted">Pabeigti darījumi</dt>
              <dd className={`font-semibold ${completionTone}`}>{completionRate}%</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-bank-muted">Aktīvās problēmas</dt>
              <dd className={`font-semibold ${issueTone}`}>{statusSummary.openIssues}</dd>
            </div>
            {isAdmin && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-bank-muted">Gaidoši lietotāji</dt>
                <dd className="font-semibold text-bank-ink">{statusSummary.pendingUsers}</dd>
              </div>
            )}
          </dl>
        </article>

        <p className="rounded-lg border border-bank-border bg-bank-panel-soft/35 px-3 py-2 text-[11px] text-bank-muted">
          Dati atjaunojas automātiski ik pēc aptuveni 45 sekundēm.
        </p>
      </div>
    </aside>
  );
}
