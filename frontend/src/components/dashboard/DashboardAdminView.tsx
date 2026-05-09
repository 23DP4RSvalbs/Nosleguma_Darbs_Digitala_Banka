import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  AdminMetrics,
  AdminFilterState,
  AdminUser,
  AdminUserEditState,
  PaginatedResponse,
  UserRole,
} from '../../lib/domain-types';

interface DashboardAdminViewProps {
  adminUsersLoading: boolean;
  adminMetricsLoading: boolean;
  adminMetrics: AdminMetrics | null;
  adminFiltersDraft: AdminFilterState;
  setAdminFiltersDraft: Dispatch<SetStateAction<AdminFilterState>>;
  setAdminFilters: Dispatch<SetStateAction<AdminFilterState>>;
  setAdminUsersPage: Dispatch<SetStateAction<number>>;
  defaultAdminFilters: AdminFilterState;
  adminRoles: UserRole[];
  adminUsers: AdminUser[];
  adminUserEdits: Record<number, AdminUserEditState>;
  setAdminUserEdits: Dispatch<SetStateAction<Record<number, AdminUserEditState>>>;
  adminUserActionLoadingId: number | null;
  currentUserId?: number;
  handleUpdateManagedUser: (
    managedUser: AdminUser,
    overrides?: { status?: AdminUser['status']; role_id?: string }
  ) => Promise<void>;
  formatDate: (value: string | null) => string;
  adminUsersPageData: PaginatedResponse<AdminUser> | null;
}

export function DashboardAdminView({
  adminUsersLoading,
  adminMetricsLoading,
  adminMetrics,
  adminFiltersDraft,
  setAdminFiltersDraft,
  setAdminFilters,
  setAdminUsersPage,
  defaultAdminFilters,
  adminRoles,
  adminUsers,
  adminUserEdits,
  setAdminUserEdits,
  adminUserActionLoadingId,
  currentUserId,
  handleUpdateManagedUser,
  formatDate,
  adminUsersPageData,
}: DashboardAdminViewProps) {
  const [approveModalUser, setApproveModalUser] = useState<AdminUser | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [controlSection, setControlSection] = useState<'users' | 'accounts' | 'payments' | 'system'>('users');

  const controlSections = [
    {
      id: 'users' as const,
      label: 'Lietotāji',
      value: adminMetrics ? `${adminMetrics.users.pending} gaida apstiprinājumu` : '-',
    },
    {
      id: 'accounts' as const,
      label: 'Konti',
      value: adminMetrics ? `${adminMetrics.accounts.frozen} iesaldēti` : '-',
    },
    {
      id: 'payments' as const,
      label: 'Maksājumi',
      value: adminMetrics ? `${adminMetrics.approvals.pending} gaida` : '-',
    },
    {
      id: 'system' as const,
      label: 'Sistēma',
      value: adminMetrics ? `${adminMetrics.operations.audit_events_24h} audita notikumi` : '-',
    },
  ];

  return (
    <section className="space-y-4">
      <article className="rounded-xl border border-bank-border bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-bank-muted">Administratora kontroles centrs</h3>
          <p className="text-xs text-bank-muted">
            {adminMetricsLoading ? 'Ielādējas operatīvie dati...' : 'Operatīvais statuss tiek atjaunots automātiski.'}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {controlSections.map((section) => {
            const active = section.id === controlSection;

            return (
              <button
                key={section.id}
                onClick={() => setControlSection(section.id)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  active
                    ? 'border-bank-cosmic bg-bank-panel-soft text-bank-cosmic'
                    : 'border-bank-border bg-white text-bank-ink hover:bg-bank-panel-soft'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em]">{section.label}</p>
                <p className="mt-1 text-sm font-medium">{section.value}</p>
              </button>
            );
          })}
        </div>
      </article>

      {controlSection === 'users' && (
        <article className="rounded-xl border border-bank-border bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-bank-muted">Lietotāju pārvaldība</h4>

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="rounded-md border border-bank-border px-2.5 py-1.5 text-xs font-semibold text-bank-ink hover:bg-bank-panel-soft"
            >
              {showFilters ? 'Paslēpt filtrus' : 'Rādīt filtrus'}
            </button>
          </div>



          {showFilters && (
            <div className="mb-3 rounded-lg border border-bank-border bg-bank-panel-soft/50 p-3" aria-busy={adminUsersLoading}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <label className="text-xs font-semibold uppercase text-bank-muted">
                  Meklēšana
                  <input
                    maxLength={120}
                    value={adminFiltersDraft.q}
                    onChange={(event) =>
                      setAdminFiltersDraft((prev) => ({ ...prev, q: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-xs font-semibold uppercase text-bank-muted">
                  Statuss
                  <select
                    value={adminFiltersDraft.status}
                    onChange={(event) =>
                      setAdminFiltersDraft((prev) => ({
                        ...prev,
                        status: event.target.value as AdminFilterState['status'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Visi</option>
                    <option value="active">Aktīvs</option>
                    <option value="blocked">Bloķēts</option>
                    <option value="pending">Gaida apstiprinājumu</option>
                  </select>
                </label>

                <label className="text-xs font-semibold uppercase text-bank-muted">
                  Loma
                  <select
                    value={adminFiltersDraft.role_code}
                    onChange={(event) =>
                      setAdminFiltersDraft((prev) => ({ ...prev, role_code: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Visas</option>
                    {adminRoles.map((role) => (
                      <option key={role.id} value={role.code}>
                        {role.name_lv}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold uppercase text-bank-muted">
                  Kārtot pēc
                  <select
                    value={adminFiltersDraft.sort_by}
                    onChange={(event) =>
                      setAdminFiltersDraft((prev) => ({
                        ...prev,
                        sort_by: event.target.value as AdminFilterState['sort_by'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="created_at">Izveides datums</option>
                    <option value="name">Vārds</option>
                    <option value="email">E-pasts</option>
                    <option value="status">Statuss</option>
                  </select>
                </label>

                <label className="text-xs font-semibold uppercase text-bank-muted">
                  Virziens
                  <select
                    value={adminFiltersDraft.sort_dir}
                    onChange={(event) =>
                      setAdminFiltersDraft((prev) => ({
                        ...prev,
                        sort_dir: event.target.value as AdminFilterState['sort_dir'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="desc">Dilstoši</option>
                    <option value="asc">Augoši</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setAdminFilters(adminFiltersDraft);
                    setAdminUsersPage(1);
                  }}
                  className="rounded-lg bg-bank-cosmic px-3 py-2 text-sm font-semibold text-white hover:bg-bank-cosmic-soft"
                >
                  Pielietot filtrus
                </button>
                <button
                  onClick={() => {
                    setAdminFiltersDraft(defaultAdminFilters);
                    setAdminFilters(defaultAdminFilters);
                    setAdminUsersPage(1);
                  }}
                  className="rounded-lg border border-bank-border px-3 py-2 text-sm font-semibold text-bank-ink hover:bg-white"
                >
                  Atiestatīt
                </button>
              </div>
            </div>
          )}

          {adminUsersLoading ? (
            <p className="text-sm text-bank-muted">Notiek lietotāju ielāde...</p>
          ) : adminUsers.length === 0 ? (
            <p className="text-sm text-bank-muted">Lietotāji netika atrasti.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-bank-border text-sm">
                <caption className="sr-only">Lietotāju saraksts ar lomu un statusa pārvaldību</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-bank-muted">
                    <th className="py-2 pr-3">Lietotājs</th>
                    <th className="py-2 pr-3">Loma</th>
                    <th className="py-2 pr-3">Statuss</th>
                    <th className="py-2 pr-3">Izveidots</th>
                    <th className="py-2">Darbības</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bank-border">
                  {adminUsers.map((managedUser) => {
                    const edit = adminUserEdits[managedUser.id] ?? {
                      role_id: managedUser.role?.id ? String(managedUser.role.id) : '',
                      status: managedUser.status,
                    };
                    const isSelf = managedUser.id === currentUserId;
                    const isSaving = adminUserActionLoadingId === managedUser.id;
                    const isAdmin = managedUser.role?.code === 'admin';
                    const isSelfAdmin = isSelf && isAdmin;
                    const isPending = managedUser.status === 'pending';
                    const isUnchanged =
                      edit.role_id === (managedUser.role?.id ? String(managedUser.role.id) : '') &&
                      edit.status === managedUser.status;
                    const rowClassName = isSelfAdmin ? 'bg-bank-panel-soft/70' : isPending ? 'bg-bank-panel-soft/40' : '';

                    return (
                      <tr key={managedUser.id} className={rowClassName}>
                        <td className="py-2 pr-3">
                          <p className="font-semibold text-bank-ink">{managedUser.name}</p>
                          <p className="text-xs text-bank-muted">{managedUser.email}</p>
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            value={edit.role_id}
                            onChange={(event) =>
                              setAdminUserEdits((prev) => ({
                                ...prev,
                                [managedUser.id]: {
                                  ...edit,
                                  role_id: event.target.value,
                                },
                              }))
                            }
                            disabled={isSelfAdmin || isPending}
                            className={`w-full rounded-lg border border-bank-border bg-bank-panel-soft px-2 py-1.5 text-xs ${isSelfAdmin || isPending ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            {adminRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name_lv}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-3">
                          {isPending ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-800">
                              Gaida apstiprinājumu no administrācijas.
                            </div>
                          ) : (
                            <select
                              value={edit.status}
                              onChange={(event) =>
                                setAdminUserEdits((prev) => ({
                                  ...prev,
                                  [managedUser.id]: {
                                    ...edit,
                                    status: event.target.value as AdminUser['status'],
                                  },
                                }))
                              }
                              disabled={isSelfAdmin}
                              className={`w-full rounded-lg border border-bank-border bg-bank-panel-soft px-2 py-1.5 text-xs ${isSelfAdmin ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              <option value="active">Aktīvs</option>
                              <option value="blocked">Bloķēts</option>
                            </select>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs text-bank-muted">{formatDate(managedUser.created_at)}</td>
                        <td className="py-2">
                          <div className="flex flex-col gap-2">
                            {isPending ? (
                              <button
                                onClick={() => setApproveModalUser(managedUser)}
                                className="rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700"
                              >
                                Apstiprināt lietotāju
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    void handleUpdateManagedUser(managedUser);
                                  }}
                                  disabled={isSaving || isUnchanged || !edit.role_id || isSelfAdmin}
                                  className="rounded-md border border-bank-border bg-bank-panel-soft px-2 py-1 text-xs font-semibold text-bank-ink disabled:opacity-50"
                                >
                                  {isSaving ? 'Saglabājas...' : 'Saglabāt'}
                                </button>
                              </div>
                            )}
                            {isSelf && !isAdmin && (
                              <span className="text-[11px] text-bank-muted">Savam profilam nevar noņemt admin lomu vai bloķēt kontu.</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-bank-muted">
            <p>
              Lapa {adminUsersPageData?.current_page ?? 1} no {adminUsersPageData?.last_page ?? 1}
            </p>
            <div className="flex gap-2">
              <button
                disabled={!adminUsersPageData || adminUsersPageData.current_page <= 1}
                onClick={() => setAdminUsersPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-md border border-bank-border px-3 py-1 disabled:opacity-40"
              >
                Iepriekš
              </button>
              <button
                disabled={!adminUsersPageData || adminUsersPageData.current_page >= adminUsersPageData.last_page}
                onClick={() =>
                  setAdminUsersPage((prev) =>
                    adminUsersPageData ? Math.min(prev + 1, adminUsersPageData.last_page) : prev
                  )
                }
                className="rounded-md border border-bank-border px-3 py-1 disabled:opacity-40"
              >
                Nākamā
              </button>
            </div>
          </div>
        </article>
      )}

      {controlSection === 'accounts' && (
        <article className="rounded-xl border border-bank-border bg-white p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-bank-muted">Kontu kontrole</h4>
          <p className="mt-1 text-sm text-bank-muted">Pārvaldi kontu statusus un identificē iesaldētos vai slēgtos kontus.</p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Kopā konti</dt>
              <dd className="mt-1 text-2xl font-semibold text-bank-ink">{adminMetrics?.accounts.total ?? '-'}</dd>
            </div>
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Iesaldēti</dt>
              <dd className="mt-1 text-2xl font-semibold text-amber-700">{adminMetrics?.accounts.frozen ?? '-'}</dd>
            </div>
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Slēgti</dt>
              <dd className="mt-1 text-2xl font-semibold text-rose-700">{adminMetrics?.accounts.closed ?? '-'}</dd>
            </div>
          </dl>


        </article>
      )}

      {controlSection === 'payments' && (
        <article className="rounded-xl border border-bank-border bg-white p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-bank-muted">Maksājumu kontrole</h4>
          <p className="mt-1 text-sm text-bank-muted">Skaties apstiprināšanas rindu un transakciju operatīvo slodzi.</p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Gaidošas apstiprināšanas</dt>
              <dd className="mt-1 text-2xl font-semibold text-bank-cosmic">{adminMetrics?.approvals.pending ?? '-'}</dd>
            </div>
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Noraidītas 24h</dt>
              <dd className="mt-1 text-2xl font-semibold text-rose-700">{adminMetrics?.transactions.rejected ?? '-'}</dd>
            </div>
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Darījumi šodien</dt>
              <dd className="mt-1 text-2xl font-semibold text-bank-ink">{adminMetrics?.operations.today_transactions ?? '-'}</dd>
            </div>
          </dl>


        </article>
      )}

      {controlSection === 'system' && (
        <article className="rounded-xl border border-bank-border bg-white p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-bank-muted">Sistēmas uzraudzība</h4>
          <p className="mt-1 text-sm text-bank-muted">Ātrs operatīvais skats par aktivitāti, sesijām un audita notikumiem.</p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Audit notikumi 24h</dt>
              <dd className="mt-1 text-2xl font-semibold text-bank-ink">{adminMetrics?.operations.audit_events_24h ?? '-'}</dd>
            </div>
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Nelasītie paziņojumi</dt>
              <dd className="mt-1 text-2xl font-semibold text-bank-cosmic">{adminMetrics?.operations.unread_notifications ?? '-'}</dd>
            </div>
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Izejošais apjoms 30d</dt>
              <dd className="mt-1 text-2xl font-semibold text-bank-ink">{adminMetrics?.operations.outgoing_volume_30d ?? '-'}</dd>
            </div>
            <div className="rounded-xl border border-bank-border bg-bank-panel-soft/75 px-4 py-3">
              <dt className="text-xs uppercase tracking-[0.11em] text-bank-muted">Bloķēti lietotāji</dt>
              <dd className="mt-1 text-2xl font-semibold text-rose-700">{adminMetrics?.users.blocked ?? '-'}</dd>
            </div>
          </dl>
        </article>
      )}
      {/* Approve user modal */}
      {approveModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setApproveModalUser(null)} />
          <div className="relative w-full max-w-2xl rounded-xl bg-white p-6">
            <h3 className="mb-3 text-lg font-semibold text-bank-ink">Apstiprināt lietotāju</h3>
            <div className="mb-4 text-sm text-bank-muted">
              <p className="font-semibold">{approveModalUser.name}</p>
              <p>{approveModalUser.email}</p>
              <div className="mt-2 space-y-1">
                <p>Adrese: {approveModalUser.address ?? '-'}</p>
                <p>Tālrunis: {approveModalUser.phone ?? '-'}</p>
                <p>Reģions: {approveModalUser.region ?? '-'}</p>
                <p>Valsts: {approveModalUser.country ?? '-'}</p>
                <p>Pasta indekss: {approveModalUser.postal_code ?? '-'}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setApproveModalUser(null)}
                className="rounded-md border border-bank-border px-3 py-2 text-sm font-semibold text-bank-ink"
              >
                Atcelt
              </button>
              <button
                onClick={async () => {
                  await handleUpdateManagedUser(approveModalUser, { status: 'blocked' });
                  setApproveModalUser(null);
                }}
                className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
              >
                Nosūtīt labošanai
              </button>
              <button
                onClick={async () => {
                  await handleUpdateManagedUser(approveModalUser, { status: 'active' });
                  setApproveModalUser(null);
                }}
                className="rounded-md bg-bank-cosmic px-3 py-2 text-sm font-semibold text-white"
              >
                Apstiprināt
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
