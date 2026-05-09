import { useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type {
  Account,
  AccountFilterState,
  AccountMember,
  AccountMemberRole,
  AccountStatus,
  AccountType,
  MemberCandidate,
  MemberEditState,
  NewAccountState,
  NewMemberState,
  PaginatedResponse,
} from '../../lib/domain-types';
import { sanitizeAccountName } from '../../lib/validation';

interface DashboardAccountsViewProps {
  accountFiltersDraft: AccountFilterState;
  setAccountFiltersDraft: Dispatch<SetStateAction<AccountFilterState>>;
  setAccountFilters: Dispatch<SetStateAction<AccountFilterState>>;
  setAccountPage: Dispatch<SetStateAction<number>>;
  defaultAccountFilters: AccountFilterState;

  accountsLoading: boolean;
  accounts: Account[];
  accountsPage: PaginatedResponse<Account> | null;

  formatMoney: (amount: number | string, currency?: string) => string;
  accountTypeLabel: (type: AccountType) => string;
  accountStatusLabel: (status: AccountStatus) => string;

  renameAccount: (account: Account) => Promise<void>;
  updateAccountStatus: (account: Account, status: AccountStatus) => Promise<void>;
  closeAccount: (account: Account) => Promise<void>;

  memberPanelAccountId: number | null;
  setMemberPanelAccountId: Dispatch<SetStateAction<number | null>>;

  setMembersNotice: Dispatch<SetStateAction<string | null>>;
  setMembersError: Dispatch<SetStateAction<string | null>>;
  setMemberCandidateQuery: Dispatch<SetStateAction<string>>;
  setMemberCandidates: Dispatch<SetStateAction<MemberCandidate[]>>;

  newMemberForm: NewMemberState;
  setNewMemberForm: Dispatch<SetStateAction<NewMemberState>>;
  memberCandidateQuery: string;
  memberCandidates: MemberCandidate[];
  memberCandidatesLoading: boolean;
  memberCandidateSearchAttempted: boolean;
  setMemberCandidateSearchAttempted: Dispatch<SetStateAction<boolean>>;

  newAccount: NewAccountState;
  setNewAccount: Dispatch<SetStateAction<NewAccountState>>;
  handleCreateAccount: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createAccountLoading: boolean;

  selectedMemberAccount: Account | null;
  membersLoading: boolean;
  accountMembers: AccountMember[];
  memberEdits: Record<number, MemberEditState>;
  setMemberEdits: Dispatch<SetStateAction<Record<number, MemberEditState>>>;
  memberActionLoadingId: number | null;
  canEditSelectedMembers: boolean;

  memberRoleLabel: (role: AccountMemberRole) => string;
  handleUpdateMember: (member: AccountMember) => Promise<void>;
  handleRemoveMember: (member: AccountMember) => Promise<void>;
  handleAddMember: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  searchMemberCandidates: () => Promise<void>;
  createMemberLoading: boolean;
}

type AccountsSection = 'list' | 'create' | 'members';

const currencyOptions = [
  { value: '', label: 'Visas valūtas' },
  { value: 'EUR', label: 'EUR' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
  { value: 'SEK', label: 'SEK' },
  { value: 'NOK', label: 'NOK' },
];

export function DashboardAccountsView({
  accountFiltersDraft,
  setAccountFiltersDraft,
  setAccountFilters,
  setAccountPage,
  defaultAccountFilters,
  accountsLoading,
  accounts,
  accountsPage,
  formatMoney,
  accountTypeLabel,
  accountStatusLabel,
  renameAccount,
  updateAccountStatus,
  closeAccount,
  memberPanelAccountId,
  setMemberPanelAccountId,
  setMembersNotice,
  setMembersError,
  setMemberCandidateQuery,
  setMemberCandidates,
  newMemberForm,
  setNewMemberForm,
  memberCandidateQuery,
  memberCandidates,
  memberCandidatesLoading,
  memberCandidateSearchAttempted,
  setMemberCandidateSearchAttempted,
  newAccount,
  setNewAccount,
  handleCreateAccount,
  createAccountLoading,
  selectedMemberAccount,
  membersLoading,
  accountMembers,
  memberEdits,
  setMemberEdits,
  memberActionLoadingId,
  canEditSelectedMembers,
  memberRoleLabel,
  handleUpdateMember,
  handleRemoveMember,
  handleAddMember,
  searchMemberCandidates,
  createMemberLoading,
}: DashboardAccountsViewProps) {
  const [activeSection, setActiveSection] = useState<AccountsSection>('list');
  const [showListFilters, setShowListFilters] = useState(false);

  return (
    <section className="space-y-5">
      <article className="rounded-xl bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-bank-ink">Konti</h3>
            <p className="text-sm text-bank-muted">Vienkāršs skats: saraksts, jauns konts un dalībnieki.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSection('list')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeSection === 'list'
                  ? 'bg-bank-panel-soft text-bank-ink'
                  : 'text-bank-muted hover:bg-bank-panel-soft hover:text-bank-ink'
              }`}
            >
              Kontu saraksts
            </button>
            <button
              onClick={() => setActiveSection('create')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeSection === 'create'
                  ? 'bg-bank-panel-soft text-bank-ink'
                  : 'text-bank-muted hover:bg-bank-panel-soft hover:text-bank-ink'
              }`}
            >
              Jauns konts
            </button>
            <button
              onClick={() => setActiveSection('members')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeSection === 'members'
                  ? 'bg-bank-panel-soft text-bank-ink'
                  : 'text-bank-muted hover:bg-bank-panel-soft hover:text-bank-ink'
              }`}
            >
              Dalībnieki
            </button>
          </div>
        </div>
      </article>

      {activeSection === 'list' && (
        <>
          <article className="rounded-xl bg-white p-4" aria-busy={accountsLoading}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-bank-muted">Kontu saraksts</h3>

              <button
                onClick={() => setShowListFilters((prev) => !prev)}
                className="rounded-md border border-bank-border px-2.5 py-1.5 text-xs font-semibold text-bank-ink hover:bg-bank-panel-soft"
              >
                {showListFilters ? 'Paslēpt filtrus' : 'Rādīt filtrus'}
              </button>
            </div>

            {showListFilters && (
              <article className="mb-4 rounded-xl border border-bank-border bg-bank-panel-soft/55 p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-bank-muted">Filtri un kārtošana</h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <label className="min-w-0 text-xs font-semibold uppercase leading-tight text-bank-muted">
                    Meklēšana
                    <input
                      maxLength={120}
                      value={accountFiltersDraft.q}
                      onChange={(event) =>
                        setAccountFiltersDraft((prev) => ({ ...prev, q: event.target.value }))
                      }
                      className="mt-1 w-full min-w-0 rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="min-w-0 text-xs font-semibold uppercase leading-tight text-bank-muted">
                    Statuss
                    <select
                      value={accountFiltersDraft.status}
                      onChange={(event) =>
                        setAccountFiltersDraft((prev) => ({
                          ...prev,
                          status: event.target.value as AccountFilterState['status'],
                        }))
                      }
                      className="mt-1 w-full min-w-0 rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Visi</option>
                      <option value="active">Aktīvs</option>
                      <option value="frozen">Iesaldēts</option>
                      <option value="closed">Aizvērts</option>
                    </select>
                  </label>

                  <label className="min-w-0 text-xs font-semibold uppercase leading-tight text-bank-muted">
                    Tips
                    <select
                      value={accountFiltersDraft.type}
                      onChange={(event) =>
                        setAccountFiltersDraft((prev) => ({
                          ...prev,
                          type: event.target.value as AccountFilterState['type'],
                        }))
                      }
                      className="mt-1 w-full min-w-0 rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Visi</option>
                      <option value="personal">Personīgais</option>
                      <option value="business">Uzņēmuma</option>
                      <option value="savings">Uzkrājumu</option>
                    </select>
                  </label>

                  <label className="min-w-0 text-xs font-semibold uppercase leading-tight text-bank-muted">
                    Valūta
                    <select
                      value={accountFiltersDraft.currency}
                      onChange={(event) =>
                        setAccountFiltersDraft((prev) => ({ ...prev, currency: event.target.value }))
                      }
                      className="mt-1 w-full min-w-0 rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                    >
                      {currencyOptions.map((option) => (
                        <option key={option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="min-w-0 text-xs font-semibold uppercase leading-tight text-bank-muted">
                    Kārtot pēc
                    <select
                      value={accountFiltersDraft.sort_by}
                      onChange={(event) =>
                        setAccountFiltersDraft((prev) => ({
                          ...prev,
                          sort_by: event.target.value as AccountFilterState['sort_by'],
                        }))
                      }
                      className="mt-1 w-full min-w-0 rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                    >
                      <option value="created_at">Izveides datums</option>
                      <option value="name">Nosaukums</option>
                      <option value="balance">Bilance</option>
                      <option value="status">Statuss</option>
                    </select>
                  </label>

                  <label className="min-w-0 text-xs font-semibold uppercase leading-tight text-bank-muted">
                    Virziens
                    <select
                      value={accountFiltersDraft.sort_dir}
                      onChange={(event) =>
                        setAccountFiltersDraft((prev) => ({
                          ...prev,
                          sort_dir: event.target.value as AccountFilterState['sort_dir'],
                        }))
                      }
                      className="mt-1 w-full min-w-0 rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                    >
                      <option value="desc">Dilstoši</option>
                      <option value="asc">Augoši</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setAccountFilters(accountFiltersDraft);
                      setAccountPage(1);
                    }}
                    className="rounded-lg bg-bank-cosmic px-3 py-2 text-sm font-semibold text-white hover:bg-bank-cosmic-soft"
                  >
                    Pielietot filtrus
                  </button>
                  <button
                    onClick={() => {
                      setAccountFiltersDraft(defaultAccountFilters);
                      setAccountFilters(defaultAccountFilters);
                      setAccountPage(1);
                    }}
                    className="rounded-lg border border-bank-border px-3 py-2 text-sm font-semibold text-bank-ink hover:bg-bank-panel-soft"
                  >
                    Atiestatīt
                  </button>
                </div>
              </article>
            )}

            {accountsLoading ? (
              <p className="text-sm text-bank-muted">Notiek kontu ielāde...</p>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-bank-muted">Konti netika atrasti.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-bank-border text-sm">
                  <caption className="sr-only">Kontu saraksts ar statusu, bilanci un darbībām</caption>
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-bank-muted">
                      <th className="py-2 pr-3">Konts</th>
                      <th className="py-2 pr-3">IBAN</th>
                      <th className="py-2 pr-3">Bilance</th>
                      <th className="py-2 pr-3">Tips</th>
                      <th className="py-2 pr-3">Statuss</th>
                      <th className="py-2">Darbības</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bank-border">
                    {accounts.map((account) => (
                      <tr key={account.id}>
                        <td className="py-2 pr-3 font-semibold">
                          <button
                            onDoubleClick={() => {
                              void renameAccount(account);
                            }}
                            className="rounded-md px-1 py-0.5 text-left hover:bg-bank-panel-soft"
                            title="Dubultklikšķis, lai pārsauktu"
                          >
                            {account.name}
                          </button>
                          {(account.access_role === 'viewer' || account.access_role === 'approver') && (
                            <span className="ml-2 inline-flex rounded-full bg-bank-panel-soft px-2 py-0.5 align-middle text-[11px] font-semibold text-bank-muted">
                              {account.access_role === 'viewer' ? 'Skatītājs' : 'Apstiprinātājs'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-bank-muted">{account.iban}</td>
                        <td className="py-2 pr-3">{formatMoney(account.balance, account.currency)}</td>
                        <td className="py-2 pr-3 text-xs">{accountTypeLabel(account.type)}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              account.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : account.status === 'frozen'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {accountStatusLabel(account.status)}
                          </span>
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {account.status !== 'closed' ? (
                              <button
                                onClick={() => {
                                  void updateAccountStatus(
                                    account,
                                    account.status === 'active' ? 'frozen' : 'active'
                                  );
                                }}
                                disabled={account.can_update_status === false}
                                className="rounded-md border border-bank-border px-2 py-1 text-xs hover:bg-bank-panel-soft disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {account.status === 'active' ? 'Iesaldēt' : 'Aktivēt'}
                              </button>
                            ) : (
                              <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                Slēgts konts
                              </span>
                            )}
                            <button
                              onClick={() => {
                                void closeAccount(account);
                              }}
                              disabled={account.status === 'closed' || account.can_close_account === false}
                              className="rounded-md border border-[#f0d7c7] bg-[#fff7f1] px-2 py-1 text-xs text-[#8f502d] hover:bg-[#feede2] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Aizvērt
                            </button>
                            <button
                              onClick={() => {
                                setMemberPanelAccountId(account.id);
                                setMembersNotice(null);
                                setMembersError(null);
                                setMemberCandidateQuery('');
                                setMemberCandidates([]);
                                setNewMemberForm((prev) => ({ ...prev, user_id: '' }));
                                setActiveSection('members');
                              }}
                              className="rounded-md border border-bank-border px-2 py-1 text-xs hover:bg-bank-panel-soft"
                            >
                              Dalībnieki
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between text-sm text-bank-muted">
              <p>
                Lapa {accountsPage?.current_page ?? 1} no {accountsPage?.last_page ?? 1}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={!accountsPage || accountsPage.current_page <= 1}
                  onClick={() => setAccountPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-md border border-bank-border px-3 py-1 disabled:opacity-40"
                >
                  Iepriekš
                </button>
                <button
                  disabled={!accountsPage || accountsPage.current_page >= accountsPage.last_page}
                  onClick={() =>
                    setAccountPage((prev) =>
                      accountsPage ? Math.min(prev + 1, accountsPage.last_page) : prev
                    )
                  }
                  className="rounded-md border border-bank-border px-3 py-1 disabled:opacity-40"
                >
                  Nākamā
                </button>
              </div>
            </div>
          </article>
        </>
      )}

      {activeSection === 'create' && (
        <article className="rounded-xl bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bank-muted">Jauns konts</h3>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <form onSubmit={handleCreateAccount} className="space-y-3">
              <label className="block text-xs font-semibold uppercase text-bank-muted">
                Nosaukums
                <input
                  required
                  maxLength={80}
                  value={newAccount.name}
                  onChange={(event) => {
                    setNewAccount((prev) => ({ ...prev, name: sanitizeAccountName(event.target.value) }));
                  }}
                  placeholder="Piemēram, Ikdienas konts"
                  className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase text-bank-muted">
                  Valūta
                  <select
                    value={newAccount.currency}
                    onChange={(event) =>
                      setNewAccount((prev) => ({ ...prev, currency: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                  >
                    {currencyOptions
                      .filter((option) => option.value !== '')
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block text-xs font-semibold uppercase text-bank-muted">
                  Tips
                  <select
                    value={newAccount.type}
                    onChange={(event) =>
                      setNewAccount((prev) => ({ ...prev, type: event.target.value as NewAccountState['type'] }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                  >
                    <option value="personal">Personīgais</option>
                    <option value="business">Uzņēmuma</option>
                    <option value="savings">Uzkrājumu</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={createAccountLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-bank-cosmic px-3 py-2 text-sm font-semibold text-white hover:bg-bank-cosmic-soft disabled:opacity-60"
              >
                {createAccountLoading ? 'Veidojas...' : 'Izveidot kontu'}
              </button>
            </form>

            <aside className="space-y-3 rounded-lg border border-bank-border bg-bank-panel-soft/55 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bank-muted">Produkta piezīmes</p>
              <p className="text-sm text-bank-muted">
                Personīgais konts paredzēts ikdienas maksājumiem, uzņēmuma konts - biznesa plūsmai, uzkrājumu konts -
                mērķiem.
              </p>
              <div className="rounded-lg bg-white px-3 py-2 text-xs text-bank-muted">
                Konta valūtu pēc izveides nevarēs mainīt bez papildu migrācijas plūsmas.
              </div>
            </aside>
          </div>
        </article>
      )}

      {activeSection === 'members' && (
        <article className="rounded-xl bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-bank-muted">Konta dalībnieki</h3>

          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
                Aktīvais konts
                <select
                  value={memberPanelAccountId ?? ''}
                  onChange={(event) => {
                    const nextId = Number(event.target.value);
                    setMemberPanelAccountId(Number.isInteger(nextId) && nextId > 0 ? nextId : null);
                    setMembersNotice(null);
                    setMembersError(null);
                    setMemberCandidateQuery('');
                    setMemberCandidates([]);
                    setMemberCandidateSearchAttempted(false);
                    setNewMemberForm((prev) => ({ ...prev, user_id: '' }));
                  }}
                  className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                >
                  <option value="">Izvēlies kontu</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.iban.slice(-6)})
                    </option>
                  ))}
                </select>
              </label>

              {!selectedMemberAccount && (
                <p className="text-sm text-bank-muted">Izvēlies kontu, lai pārvaldītu dalībniekus.</p>
              )}
            </div>

            <aside className="self-start rounded-lg border border-bank-border bg-bank-panel-soft/65 px-3 py-2 text-xs text-bank-muted">
              <p className="font-semibold uppercase tracking-wider">Lomu nozīme</p>
              <p className="mt-1">
                Skatītājs: var skatīt un izveidot maksājumus. Operators: var veidot un apstiprināt maksājumus.
                Apstiprinātājs: var apstiprināt maksājumus un iesaldēt kontu, bet neveido maksājumus.
              </p>
            </aside>
          </div>

          {selectedMemberAccount ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-bank-panel-soft px-3 py-2">
                <p className="text-xs uppercase tracking-wider text-bank-muted">Aktīvais konts</p>
                <p className="text-sm font-semibold text-bank-ink">{selectedMemberAccount.name}</p>
                <p className="text-xs text-bank-muted">{selectedMemberAccount.iban}</p>
              </div>

              {selectedMemberAccount.status === 'closed' && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Aizvērtam kontam dalībnieku sastāvu mainīt nevar.
                </p>
              )}

              {membersLoading ? (
                <p className="text-sm text-bank-muted">Notiek dalībnieku ielāde...</p>
              ) : (
                <div className="space-y-2">
                  {accountMembers.length === 0 ? (
                    <p className="text-sm text-bank-muted">Kontam nav papildu dalībnieku.</p>
                  ) : (
                    accountMembers.map((member) => {
                      const isOwnerMember = member.member_role === 'owner';
                      const edit = memberEdits[member.id] ?? {
                        member_role: isOwnerMember ? 'viewer' : member.member_role,
                        daily_limit: member.daily_limit ?? '',
                      };
                      const isRowLoading = memberActionLoadingId === member.id;

                      return (
                        <div key={member.id} className="rounded-lg bg-bank-panel-soft p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-bank-ink">
                                {member.user?.name ?? `Lietotājs #${member.user_id}`}
                              </p>
                              <p className="text-xs text-bank-muted">{member.user?.email ?? 'E-pasts nav pieejams'}</p>
                            </div>
                            <span className="rounded-full bg-bank-panel-soft px-2 py-0.5 text-[11px] font-semibold text-bank-muted">
                              {memberRoleLabel(member.member_role)}
                            </span>
                          </div>

                          {!isOwnerMember && canEditSelectedMembers ? (
                            <div className="mt-2 space-y-2">
                              <label className="block text-xs font-semibold uppercase text-bank-muted">
                                Loma
                                <select
                                  value={edit.member_role}
                                  onChange={(event) =>
                                    setMemberEdits((prev) => ({
                                      ...prev,
                                      [member.id]: {
                                        ...edit,
                                        member_role: event.target.value as MemberEditState['member_role'],
                                      },
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-2 py-1.5 text-xs"
                                >
                                  <option value="viewer">Skatītājs</option>
                                  <option value="operator">Operators</option>
                                  <option value="approver">Apstiprinātājs</option>
                                </select>
                              </label>

                              <label className="block text-xs font-semibold uppercase text-bank-muted">
                                Dienas limits ({selectedMemberAccount.currency})
                                <input
                                  type="number"
                                  min="0"
                                  max="999999999.99"
                                  step="0.01"
                                  value={edit.daily_limit}
                                  onChange={(event) =>
                                    setMemberEdits((prev) => ({
                                      ...prev,
                                      [member.id]: {
                                        ...edit,
                                        daily_limit: event.target.value,
                                      },
                                    }))
                                  }
                                  className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-2 py-1.5 text-xs"
                                />
                              </label>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => {
                                    void handleUpdateMember(member);
                                  }}
                                  disabled={isRowLoading}
                                  className="rounded-md border border-bank-border bg-bank-panel-soft px-2 py-1 text-xs font-semibold text-bank-ink disabled:opacity-50"
                                >
                                  {isRowLoading ? 'Saglabājas...' : 'Saglabāt'}
                                </button>
                                <button
                                  onClick={() => {
                                    void handleRemoveMember(member);
                                  }}
                                  disabled={isRowLoading}
                                  className="rounded-md border border-[#f0d7c7] bg-[#fff7f1] px-2 py-1 text-xs font-semibold text-[#8f502d] disabled:opacity-50"
                                >
                                  Noņemt
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-bank-muted">
                              Dienas limits:{' '}
                              {member.daily_limit ? formatMoney(member.daily_limit, selectedMemberAccount.currency) : 'Nav'}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {canEditSelectedMembers && (
                <form onSubmit={handleAddMember} className="space-y-2 rounded-lg bg-bank-panel-soft p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-bank-muted">
                    Pievienot dalībnieku
                  </p>

                  <label className="block min-w-0 text-xs font-semibold uppercase leading-tight text-bank-muted">
                    Meklēt lietotāju (vārds vai e-pasts)
                    <div className="mt-1 flex gap-2">
                      <input
                        required
                        minLength={2}
                        maxLength={120}
                        value={memberCandidateQuery}
                        onChange={(event) => {
                          setMemberCandidateQuery(event.target.value);
                          setMembersError(null);
                          setMemberCandidateSearchAttempted(false);
                          if (newMemberForm.user_id) {
                            setNewMemberForm((prev) => ({ ...prev, user_id: '' }));
                          }
                        }}
                        className="w-full min-w-0 rounded-lg border border-bank-border bg-white px-2 py-1.5 text-xs"
                        placeholder="Piemērs: Janis Berzins vai janis@example.com"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void searchMemberCandidates();
                        }}
                        disabled={memberCandidatesLoading}
                        className="rounded-md border border-bank-border bg-bank-panel-soft px-2 py-1 text-xs font-semibold text-bank-ink disabled:opacity-50"
                      >
                        {memberCandidatesLoading ? 'Meklē...' : 'Meklēt'}
                      </button>
                    </div>
                  </label>

                  {memberCandidates.length > 0 && (
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-white p-2">
                      {memberCandidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          type="button"
                          onClick={() => {
                            setNewMemberForm((prev) => ({ ...prev, user_id: String(candidate.id) }));
                            setMemberCandidateQuery(`${candidate.name} (${candidate.email})`);
                            setMemberCandidates([]);
                            setMembersError(null);
                            setMemberCandidateSearchAttempted(false);
                          }}
                          className="w-full rounded-md border border-transparent px-2 py-1.5 text-left text-xs hover:border-bank-border hover:bg-bank-panel-soft"
                        >
                          <p className="font-semibold text-bank-ink">{candidate.name}</p>
                          <p className="text-bank-muted">{candidate.email}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {!memberCandidatesLoading &&
                    memberCandidates.length === 0 &&
                    memberCandidateQuery.trim().length >= 2 &&
                    !newMemberForm.user_id &&
                    !memberCandidateSearchAttempted && (
                      <p className="rounded-md bg-bank-panel-soft px-2 py-1.5 text-xs text-bank-muted">
                        Nospied “Meklēt”, lai pārbaudītu kandidātus.
                      </p>
                    )}

                  {!memberCandidatesLoading &&
                    memberCandidateQuery.trim().length >= 2 &&
                    memberCandidates.length === 0 &&
                    !newMemberForm.user_id &&
                    memberCandidateSearchAttempted && (
                      <p className="rounded-md bg-bank-panel-soft px-2 py-1.5 text-xs text-bank-muted">
                        Nav atrastu kandidātu. Pamēģini citu meklēšanas frāzi.
                      </p>
                    )}

                  <label className="block text-xs font-semibold uppercase text-bank-muted">
                    Loma
                    <select
                      value={newMemberForm.member_role}
                      onChange={(event) =>
                        setNewMemberForm((prev) => ({
                          ...prev,
                          member_role: event.target.value as NewMemberState['member_role'],
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-bank-border bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="viewer">Skatītājs</option>
                      <option value="operator">Operators</option>
                      <option value="approver">Apstiprinātājs</option>
                    </select>
                  </label>

                  <label className="block text-xs font-semibold uppercase text-bank-muted">
                    Dienas limits ({selectedMemberAccount.currency})
                    <input
                      type="number"
                      min="0"
                      max="999999999.99"
                      step="0.01"
                      value={newMemberForm.daily_limit}
                      onChange={(event) =>
                        setNewMemberForm((prev) => ({ ...prev, daily_limit: event.target.value }))
                      }
                      placeholder="Piemēram, 1000"
                      className="mt-1 w-full rounded-lg border border-bank-border bg-white px-2 py-1.5 text-xs"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={createMemberLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-bank-cosmic px-3 py-2 text-xs font-semibold text-white hover:bg-bank-cosmic-soft disabled:opacity-60"
                  >
                    {createMemberLoading ? 'Pievieno...' : 'Pievienot dalībnieku'}
                  </button>
                </form>
              )}
            </div>
          ) : null}
        </article>
      )}
    </section>
  );
}
