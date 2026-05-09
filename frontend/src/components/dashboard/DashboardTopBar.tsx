import { useState } from 'react';
import asteraLogo from '../../assets/astera-logo.png';

interface DashboardTopBarProps {
  userName: string;
  profilePicture: string | null;
  currentDate: string;
  profileLockNotice?: string | null;
  profileLockTone?: 'warning' | 'danger';
  onLogout: () => void;
}

export function DashboardTopBar({
  userName,
  profilePicture,
  currentDate,
  profileLockNotice,
  profileLockTone = 'warning',
  onLogout,
}: DashboardTopBarProps) {
  const [failedProfilePicture, setFailedProfilePicture] = useState<string | null>(null);

  return (
    <header className="sticky top-0 z-30 border-b border-bank-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bank-panel-soft text-sm font-bold uppercase text-bank-cosmic" aria-hidden="true">
            {profilePicture && failedProfilePicture !== profilePicture ? (
              <img
                src={profilePicture}
                alt=""
                className="block h-full w-full rounded-full object-cover object-center"
                onError={() => setFailedProfilePicture(profilePicture)}
              />
            ) : (
              <img src={asteraLogo} alt="" className="block h-full w-full rounded-full object-cover object-center" />
            )}
          </span>

          <div>
            <p className="text-sm font-semibold tracking-tight text-bank-ink">Astera Banka</p>
            <p className="mt-0.5 text-xs font-medium text-bank-muted">{currentDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-bank-ink">{userName}</p>
          </div>

          <button
            onClick={onLogout}
            className="inline-flex items-center rounded-lg border border-bank-border bg-white px-3 py-2 text-sm font-semibold text-bank-ink transition hover:bg-bank-panel-soft"
          >
            Iziet
          </button>
        </div>
      </div>

      {profileLockNotice ? (
        <div className={profileLockTone === 'danger' ? 'border-t border-rose-200 bg-rose-50/80' : 'border-t border-amber-200 bg-amber-50/90'}>
          <div className={`mx-auto max-w-[1240px] px-5 py-2 text-sm font-semibold ${profileLockTone === 'danger' ? 'text-rose-900' : 'text-amber-900'}`}>
            {profileLockNotice}
          </div>
        </div>
      ) : null}
    </header>
  );
}
