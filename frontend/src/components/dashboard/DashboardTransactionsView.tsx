import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type {
  Account,
  PaginatedResponse,
  Transaction,
  TransactionCategory,
  TransactionFilterState,
  TransactionStatus,
  TransferFormState,
  TransferRecipient,
} from '../../lib/domain-types';
import { MAX_TRANSFER_AMOUNT, normalizeIban, sanitizePlainText } from '../../lib/validation';

interface DashboardTransactionsViewProps {
  transactionFiltersDraft: TransactionFilterState;
  setTransactionFiltersDraft: Dispatch<SetStateAction<TransactionFilterState>>;
  setTransactionFilters: Dispatch<SetStateAction<TransactionFilterState>>;
  setTransactionPage: Dispatch<SetStateAction<number>>;
  defaultTransactionFilters: TransactionFilterState;

  accountOptions: Account[];
  recipientOptions: TransferRecipient[];
  recipientOptionsLoading: boolean;
  approvalQueueLoading: boolean;
  approvableTransactions: Transaction[];
  transactionActionLoadingId: number | null;
  accountMap: Map<number, Account>;

  formatMoney: (amount: number | string, currency?: string) => string;
  formatDate: (value: string | null) => string;

  approveTransaction: (tx: Transaction) => Promise<void>;
  rejectTransaction: (tx: Transaction) => Promise<void>;

  transferForm: TransferFormState;
  setTransferForm: Dispatch<SetStateAction<TransferFormState>>;
  handleCreateTransaction: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  transferLoading: boolean;

  transactionsLoading: boolean;
  transactions: Transaction[];

  transactionCategoryLabel: (category: TransactionCategory) => string;
  transactionStatusLabel: (status: TransactionStatus) => string;
  transactionStatusClasses: (status: TransactionStatus) => string;

  currentUserId?: number;
  isAdmin: boolean;

  editTransaction: (
    tx: Transaction,
    payload: { description: string; category: TransactionCategory }
  ) => Promise<void>;
  deleteTransaction: (tx: Transaction) => Promise<void>;

  transactionsPageData: PaginatedResponse<Transaction> | null;
  initialSection?: TransactionSection;
}

type TransactionSection = 'history' | 'payment' | 'approvals';

function accountRoleLabel(account: Account): string {
  switch (account.access_role) {
    case 'owner':
      return 'Īpašnieks';
    case 'viewer':
      return 'Skatītājs';
    case 'operator':
      return 'Operators';
    case 'approver':
      return 'Apstiprinātājs';
    case 'admin':
      return 'Administrators';
    default:
      return 'Nav lomas';
  }
}

function accountOptionLabel(account: Account, formatMoney: (amount: number | string, currency?: string) => string): string {
  const name = account.name.length > 26 ? `${account.name.slice(0, 26)}...` : account.name;
  return `${name} · ${formatMoney(account.balance, account.currency)} · ${accountRoleLabel(account)}`;
}

export function DashboardTransactionsView({
  transactionFiltersDraft,
  setTransactionFiltersDraft,
  setTransactionFilters,
  setTransactionPage,
  defaultTransactionFilters,
  accountOptions,
  recipientOptions,
  recipientOptionsLoading,
  approvalQueueLoading,
  approvableTransactions,
  transactionActionLoadingId,
  accountMap,
  formatMoney,
  formatDate,
  approveTransaction,
  rejectTransaction,
  transferForm,
  setTransferForm,
  handleCreateTransaction,
  transferLoading,
  transactionsLoading,
  transactions,
  transactionCategoryLabel,
  transactionStatusLabel,
  transactionStatusClasses,
  currentUserId,
  isAdmin,
  editTransaction,
  deleteTransaction,
  transactionsPageData,
  initialSection = 'history',
}: DashboardTransactionsViewProps) {
  const [activeSection, setActiveSection] = useState<TransactionSection>(initialSection);
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);

  const transferAmount = Number(transferForm.amount || 0);
  const calculatedFee =
    Number.isFinite(transferAmount) && transferAmount > 0
      ? Number((transferAmount * 0.025).toFixed(2))
      : 0;
  const totalDebit = Number((transferAmount + calculatedFee).toFixed(2));
  const selectedFromAccount = transferForm.from_account_id
    ? accountMap.get(Number(transferForm.from_account_id))
    : null;
  const recipientOptionsForTarget = selectedFromAccount
    ? recipientOptions.filter((recipient) => recipient.id !== selectedFromAccount.id)
    : recipientOptions;
  const normalizedRecipientQuery = transferForm.recipient_query.replace(/\s+/g, '').toUpperCase();
  const selectedRecipient = recipientOptionsForTarget.find(
    (recipient) => recipient.id === Number(transferForm.to_account_id)
  );
  const recipientValidationMessage = normalizedRecipientQuery !== '' && normalizedRecipientQuery.length >= 4 && !selectedRecipient
    ? 'Nav iespējams nosūtīt ievadītajam kontam.'
    : null;
  const debitCurrency = selectedFromAccount?.currency ?? 'EUR';
  const selectedFromBalance = selectedFromAccount ? Number(selectedFromAccount.balance) : 0;
  const projectedBalance = selectedFromBalance - totalDebit;

  const canSubmitTransfer =
    !transferLoading &&
    transferForm.from_account_id !== '' &&
    transferForm.to_account_id !== '' &&
    !recipientValidationMessage &&
    transferAmount > 0 &&
    transferAmount <= MAX_TRANSFER_AMOUNT;

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<TransactionCategory>('transfer');
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  function openEditModal(tx: Transaction): void {
    setEditingTransaction(tx);
    setEditDescription(tx.description ?? '');
    setEditCategory(tx.category);
  }

  function closeEditModal(): void {
    if (editSubmitting) {
      return;
    }

    setEditingTransaction(null);
    setEditDescription('');
    setEditCategory('transfer');
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!editingTransaction) {
      return;
    }

    setEditSubmitting(true);

    try {
      await editTransaction(editingTransaction, {
        description: editDescription.trim(),
        category: editCategory,
      });

      closeEditModal();
    } catch {
      // Errors are surfaced through global toast handling in App.
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <section className="min-w-0 space-y-5">
      <article className="w-full rounded-xl bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-bank-ink">Maksājumi</h3>
            <p className="text-sm text-bank-muted">Vēsture, jauns maksājums un apstiprināšanas rinda vienā darba zonā.</p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              onClick={() => setActiveSection('history')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeSection === 'history'
                  ? 'bg-bank-panel-soft text-bank-ink'
                  : 'text-bank-muted hover:bg-bank-panel-soft hover:text-bank-ink'
              }`}
            >
              Vēsture
            </button>
            <button
              onClick={() => setActiveSection('payment')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeSection === 'payment'
                  ? 'bg-bank-panel-soft text-bank-ink'
                  : 'text-bank-muted hover:bg-bank-panel-soft hover:text-bank-ink'
              }`}
            >
              Jauns maksājums
            </button>
            <button
              onClick={() => setActiveSection('approvals')}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeSection === 'approvals'
                  ? 'bg-bank-panel-soft text-bank-ink'
                  : 'text-bank-muted hover:bg-bank-panel-soft hover:text-bank-ink'
              }`}
            >
              Apstiprinājumi
            </button>
          </div>
        </div>
      </article>

      {activeSection === 'approvals' && (
        <article className="w-full rounded-xl bg-white p-4" aria-busy={approvalQueueLoading}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-bank-muted">Apstiprināšanas rinda</h3>
            <span className="rounded-full bg-bank-panel-soft px-2.5 py-1 text-xs font-semibold text-bank-muted">
              {approvableTransactions.length}
            </span>
          </div>

          {approvalQueueLoading ? (
            <p className="text-sm text-bank-muted">Notiek apstiprinājumu ielāde...</p>
          ) : approvableTransactions.length === 0 ? (
            <p className="text-sm text-bank-muted">Nav gaidošu transakciju, kuras varat apstiprināt.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {approvableTransactions.map((tx) => {
                const isActionLoading = transactionActionLoadingId === tx.id;
                const fromAccount = accountMap.get(tx.from_account_id);
                const toAccount = accountMap.get(tx.to_account_id);

                return (
                  <div key={tx.id} className="rounded-lg bg-bank-panel-soft/55 p-3">
                    <p className="text-xs text-bank-muted">
                      Ref: <span className="font-mono">{tx.reference}</span>
                    </p>
                    <p className="mt-1 text-sm font-semibold text-bank-ink">
                      {formatMoney(Number(tx.amount) + Number(tx.fee), tx.currency)}
                    </p>
                    <p className="mt-1 break-words text-xs text-bank-muted">
                      {fromAccount?.name ?? tx.from_iban ?? tx.from_account_id} uz {toAccount?.name ?? tx.to_iban ?? tx.to_account_id}
                    </p>
                    <p className="mt-1 text-xs text-bank-muted">{formatDate(tx.created_at)}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          void approveTransaction(tx);
                        }}
                        disabled={isActionLoading}
                        className="rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 disabled:opacity-50"
                      >
                        {isActionLoading ? 'Apstrāde...' : 'Apstiprināt'}
                      </button>
                      <button
                        onClick={() => {
                          void rejectTransaction(tx);
                        }}
                        disabled={isActionLoading}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 disabled:opacity-50"
                      >
                        Noraidīt
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      )}

      {activeSection === 'payment' && (
        <article className="w-full rounded-xl bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-bank-muted">Jauns pārskaitījums</h3>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <form onSubmit={handleCreateTransaction} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label htmlFor="tx-from-account" className="block text-xs font-semibold uppercase text-bank-muted">
                  No konta
                  <select
                    required
                    id="tx-from-account"
                    aria-label="No konta"
                    value={transferForm.from_account_id}
                    onChange={(event) =>
                      setTransferForm((prev) => ({ ...prev, from_account_id: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                  >
                    <option value="">Izvēlies</option>
                    {accountOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {accountOptionLabel(account, formatMoney)}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="tx-recipient" className="block text-xs font-semibold uppercase text-bank-muted">
                  Saņēmēja konta numurs (IBAN)
                  <input
                    required
                    type="text"
                    maxLength={34}
                    id="tx-recipient"
                    aria-label="Saņēmēja konta numurs"
                    value={transferForm.recipient_query}
                    onChange={(event) => {
                      const normalizedNextQuery = normalizeIban(event.target.value);
                      const directMatch = recipientOptionsForTarget.find((recipient) => {
                        const iban = recipient.iban.replace(/\s+/g, '').toUpperCase();
                        return iban === normalizedNextQuery || String(recipient.id) === normalizedNextQuery;
                      });
                      const partialMatches = recipientOptionsForTarget.filter((recipient) =>
                        recipient.iban.replace(/\s+/g, '').toUpperCase().startsWith(normalizedNextQuery)
                      );
                      const matchedRecipient = directMatch ?? (partialMatches.length === 1 ? partialMatches[0] : null);

                      setTransferForm((prev) => ({
                        ...prev,
                        recipient_query: normalizedNextQuery,
                        to_account_id: matchedRecipient ? String(matchedRecipient.id) : '',
                      }));
                    }}
                    placeholder={recipientOptionsLoading ? 'Ielādē saņēmējus...' : 'Piemēram, LV97HABA0551045570210'}
                    className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label htmlFor="tx-amount" className="block text-xs font-semibold uppercase text-bank-muted">
                  Summa
                  <input
                    required
                    type="text"
                    inputMode="decimal"
                    id="tx-amount"
                    aria-label="Summa"
                    value={transferForm.amount}
                    onKeyDown={(event) => {
                      if (['e', 'E', '+', '-'].includes(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      const normalized = event.target.value.replace(',', '.');
                      if (normalized !== '' && !/^\d*(\.\d{0,2})?$/.test(normalized)) {
                        return;
                      }
                      if (Number(normalized || 0) > MAX_TRANSFER_AMOUNT) {
                        return;
                      }

                      const amountValue = normalized;
                      const parsedAmount = Number(amountValue || 0);
                      const nextFee =
                        Number.isFinite(parsedAmount) && parsedAmount > 0
                          ? (parsedAmount * 0.025).toFixed(2)
                          : '0.00';

                      setTransferForm((prev) => ({
                        ...prev,
                        amount: amountValue,
                        fee: nextFee,
                      }));
                    }}
                    placeholder="Piemēram, 250"
                    className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                  />
                </label>

                <label htmlFor="tx-category" className="block text-xs font-semibold uppercase text-bank-muted">
                  Kategorija
                  <select
                    id="tx-category"
                    aria-label="Kategorija"
                    value={transferForm.category}
                    onChange={(event) =>
                      setTransferForm((prev) => ({
                        ...prev,
                        category: event.target.value as TransactionCategory,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                  >
                    <option value="transfer">Pārskaitījums</option>
                    <option value="salary">Alga</option>
                    <option value="utilities">Komunālie</option>
                    <option value="shopping">Iepirkšanās</option>
                    <option value="other">Cits</option>
                  </select>
                </label>
              </div>

              <label htmlFor="tx-description" className="block text-xs font-semibold uppercase text-bank-muted">
                Apraksts
                <textarea
                  id="tx-description"
                  aria-label="Apraksts"
                  value={transferForm.description}
                  onChange={(event) =>
                    setTransferForm((prev) => ({ ...prev, description: sanitizePlainText(event.target.value, 240) }))
                  }
                  rows={3}
                  maxLength={240}
                  placeholder="Īss maksājuma mērķa apraksts"
                  className="mt-1 w-full resize-none rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                />
              </label>

              <button
                type="submit"
                disabled={!canSubmitTransfer}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-bank-cosmic px-3 py-2 text-sm font-semibold text-white hover:bg-bank-cosmic-soft disabled:opacity-60"
              >
                {transferLoading ? 'Veidojas...' : 'Izveidot transakciju'}
              </button>
            </form>

            <aside className="space-y-3 rounded-lg border border-bank-border bg-bank-panel-soft/55 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-bank-muted">Kopsavilkums</p>
              <div className="rounded-lg bg-white px-3 py-2 text-bank-muted overflow-x-auto">
                <span className="inline-block whitespace-nowrap">No konta tiks noņemts {formatMoney(totalDebit, debitCurrency)}.</span>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 text-bank-muted overflow-x-auto">
                <span className="inline-block whitespace-nowrap">Komisija: <span className="font-semibold text-bank-ink">{formatMoney(calculatedFee, debitCurrency)}</span></span>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 text-bank-muted">
                Katrs maksājums nonāk apstiprināšanas rindā un jāapstiprina atsevišķi.
              </div>

              {recipientValidationMessage ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 overflow-x-auto">
                  <span className="inline-block whitespace-nowrap">{recipientValidationMessage}</span>
                </div>
              ) : null}

              {selectedFromAccount && (
                <div className="rounded-lg bg-white px-3 py-2 text-bank-muted overflow-x-auto">
                  <span className="inline-block whitespace-nowrap">Atlikums pēc maksājuma: <span className={projectedBalance < 0 ? 'font-semibold text-red-700' : 'font-semibold text-bank-ink'}>{formatMoney(projectedBalance, selectedFromAccount.currency)}</span></span>
                </div>
              )}
            </aside>
          </div>
        </article>
      )}

      {activeSection === 'history' && (
        <article className="w-full rounded-xl bg-white p-4" aria-busy={transactionsLoading}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-bank-muted">Transakciju vēsture</h3>

            <button
              onClick={() => setShowHistoryFilters((prev) => !prev)}
              className="rounded-md border border-bank-border px-2.5 py-1.5 text-xs font-semibold text-bank-ink hover:bg-bank-panel-soft"
            >
              {showHistoryFilters ? 'Paslēpt filtrus' : 'Rādīt filtrus'}
            </button>
          </div>

          {showHistoryFilters && (
            <article className="mb-4 rounded-xl border border-bank-border bg-bank-panel-soft/55 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-bank-muted">Filtri un kārtošana</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                <label htmlFor="tx-filter-q" className="text-xs font-semibold uppercase text-bank-muted">
                  Meklēšana
                  <input
                    id="tx-filter-q"
                    aria-label="Meklēšana"
                    maxLength={120}
                    value={transactionFiltersDraft.q}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({ ...prev, q: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label htmlFor="tx-filter-account" className="text-xs font-semibold uppercase text-bank-muted">
                  Konts
                  <select
                    id="tx-filter-account"
                    aria-label="Konts"
                    value={transactionFiltersDraft.account_id}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({ ...prev, account_id: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Visi</option>
                    {accountOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.iban.slice(-6)})
                        {' · '}
                        {accountRoleLabel(account)}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="tx-filter-status" className="text-xs font-semibold uppercase text-bank-muted">
                  Statuss
                  <select
                    id="tx-filter-status"
                    aria-label="Statuss"
                    value={transactionFiltersDraft.status}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({
                        ...prev,
                        status: event.target.value as TransactionFilterState['status'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Visi</option>
                    <option value="pending">Gaida apstiprinājumu</option>
                    <option value="completed">Izpildīts</option>
                    <option value="rejected">Noraidīts</option>
                    <option value="failed">Neizdevās</option>
                  </select>
                </label>

                <label htmlFor="tx-filter-category" className="text-xs font-semibold uppercase text-bank-muted">
                  Kategorija
                  <select
                    id="tx-filter-category"
                    aria-label="Kategorija"
                    value={transactionFiltersDraft.category}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({
                        ...prev,
                        category: event.target.value as TransactionFilterState['category'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Visas</option>
                    <option value="transfer">Pārskaitījums</option>
                    <option value="salary">Alga</option>
                    <option value="utilities">Komunālie</option>
                    <option value="shopping">Iepirkšanās</option>
                    <option value="other">Cits</option>
                  </select>
                </label>

                <label htmlFor="tx-filter-sort-by" className="text-xs font-semibold uppercase text-bank-muted">
                  Kārtot pēc
                  <select
                    id="tx-filter-sort-by"
                    aria-label="Kārtot pēc"
                    value={transactionFiltersDraft.sort_by}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({
                        ...prev,
                        sort_by: event.target.value as TransactionFilterState['sort_by'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="created_at">Izveides datums</option>
                    <option value="executed_at">Izpildes datums</option>
                    <option value="amount">Summa</option>
                    <option value="status">Statuss</option>
                  </select>
                </label>

                <label htmlFor="tx-filter-sort-dir" className="text-xs font-semibold uppercase text-bank-muted">
                  Kārtošanas virziens
                  <select
                    id="tx-filter-sort-dir"
                    aria-label="Kārtošanas virziens"
                    value={transactionFiltersDraft.sort_dir}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({
                        ...prev,
                        sort_dir: event.target.value as TransactionFilterState['sort_dir'],
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="desc">Dilstoši</option>
                    <option value="asc">Augoši</option>
                  </select>
                </label>

                <label htmlFor="tx-filter-amount-min" className="text-xs font-semibold uppercase text-bank-muted">
                  Min summa
                  <input
                    id="tx-filter-amount-min"
                    aria-label="Min summa"
                    type="number"
                    min="0"
                    max="999999999.99"
                    value={transactionFiltersDraft.amount_min}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({ ...prev, amount_min: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label htmlFor="tx-filter-amount-max" className="text-xs font-semibold uppercase text-bank-muted">
                  Max summa
                  <input
                    id="tx-filter-amount-max"
                    aria-label="Max summa"
                    type="number"
                    min="0"
                    max="999999999.99"
                    value={transactionFiltersDraft.amount_max}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({ ...prev, amount_max: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label htmlFor="tx-filter-date-from" className="text-xs font-semibold uppercase text-bank-muted">
                  No datuma
                  <input
                    id="tx-filter-date-from"
                    aria-label="No datuma"
                    type="date"
                    value={transactionFiltersDraft.date_from}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({ ...prev, date_from: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label htmlFor="tx-filter-date-to" className="text-xs font-semibold uppercase text-bank-muted">
                  Līdz datumam
                  <input
                    id="tx-filter-date-to"
                    aria-label="Līdz datumam"
                    type="date"
                    value={transactionFiltersDraft.date_to}
                    onChange={(event) =>
                      setTransactionFiltersDraft((prev) => ({ ...prev, date_to: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-bank-border bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setTransactionFilters(transactionFiltersDraft);
                    setTransactionPage(1);
                  }}
                  className="rounded-lg bg-bank-cosmic px-3 py-2 text-sm font-semibold text-white hover:bg-bank-cosmic-soft"
                >
                  Pielietot filtrus
                </button>
                <button
                  onClick={() => {
                    setTransactionFiltersDraft(defaultTransactionFilters);
                    setTransactionFilters(defaultTransactionFilters);
                    setTransactionPage(1);
                  }}
                  className="rounded-lg border border-bank-border px-3 py-2 text-sm font-semibold text-bank-ink hover:bg-bank-panel-soft"
                >
                  Atiestatīt
                </button>
              </div>
            </article>
          )}

          {transactionsLoading ? (
            <p className="text-sm text-bank-muted">Notiek transakciju ielāde...</p>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-bank-muted">Transakcijas netika atrastas.</p>
          ) : (
            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-[860px] divide-y divide-bank-border text-sm">
                <caption className="sr-only">Transakciju saraksts ar darbībām</caption>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-bank-muted">
                    <th className="py-2 pr-3">Ref</th>
                    <th className="py-2 pr-3">No / Uz</th>
                    <th className="py-2 pr-3">Summa</th>
                    <th className="py-2 pr-3">Kategorija</th>
                    <th className="py-2 pr-3 whitespace-nowrap">Statuss</th>
                    <th className="py-2 pr-3 whitespace-nowrap">Datums</th>
                    <th className="py-2">Darbības</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bank-border">
                  {transactions.map((tx) => {
                    const ownOutgoing = accountMap.has(tx.from_account_id);
                    const rowTone = ownOutgoing ? 'text-[#7a3d1f]' : 'text-bank-ink';

                    return (
                      <tr key={tx.id}>
                        <td className="py-2 pr-3 font-mono text-xs">{tx.reference}</td>
                        <td className="py-2 pr-3 text-xs text-bank-muted">
                          <p className="break-all">{tx.from_iban ?? tx.from_account_id}</p>
                          <p className="break-all">{tx.to_iban ?? tx.to_account_id}</p>
                        </td>
                        <td className={`py-2 pr-3 font-semibold ${rowTone}`}>
                          {ownOutgoing ? '-' : '+'}
                          {formatMoney(tx.amount, tx.currency)}
                        </td>
                        <td className="py-2 pr-3 text-xs">{transactionCategoryLabel(tx.category)}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${transactionStatusClasses(tx.status)}`}
                          >
                            {transactionStatusLabel(tx.status)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap text-xs text-bank-muted">{formatDate(tx.created_at)}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => {
                                openEditModal(tx);
                              }}
                              disabled={!isAdmin && tx.initiator_user_id !== currentUserId}
                              className="rounded-md border border-bank-border px-2 py-1 text-xs disabled:opacity-40"
                            >
                              Labot
                            </button>
                            <button
                              onClick={() => {
                                void deleteTransaction(tx);
                              }}
                              disabled={tx.status === 'completed' || (!isAdmin && tx.initiator_user_id !== currentUserId)}
                              className="rounded-md border border-[#f0d7c7] bg-[#fff7f1] px-2 py-1 text-xs text-[#8f502d] disabled:opacity-40"
                            >
                              Dzēst
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-bank-muted">
            <p>
              Lapa {transactionsPageData?.current_page ?? 1} no {transactionsPageData?.last_page ?? 1}
            </p>
            <div className="flex gap-2">
              <button
                disabled={!transactionsPageData || transactionsPageData.current_page <= 1}
                onClick={() => setTransactionPage((prev) => Math.max(prev - 1, 1))}
                className="rounded-md border border-bank-border px-3 py-1 disabled:opacity-40"
              >
                Iepriekš
              </button>
              <button
                disabled={
                  !transactionsPageData ||
                  transactionsPageData.current_page >= transactionsPageData.last_page
                }
                onClick={() =>
                  setTransactionPage((prev) =>
                    transactionsPageData
                      ? Math.min(prev + 1, transactionsPageData.last_page)
                      : prev
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

      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bank-ink/35 px-4 py-6 backdrop-blur-[1px]">
          <article className="w-full max-w-lg rounded-xl border border-bank-border bg-white p-5 shadow-[0_14px_36px_rgba(19,34,66,0.22)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-bank-ink">Rediģēt transakciju</h3>
                <p className="text-xs text-bank-muted">
                  Ref: <span className="font-mono">{editingTransaction.reference}</span>
                </p>
              </div>

              <button
                onClick={closeEditModal}
                className="rounded-lg border border-bank-border bg-bank-panel-soft p-1.5 text-bank-muted transition hover:text-bank-ink"
                aria-label="Aizvērt rediģēšanas logu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <label htmlFor="tx-edit-category" className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
                Kategorija
                <select
                  id="tx-edit-category"
                  aria-label="Kategorija"
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value as TransactionCategory)}
                  className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                >
                  <option value="transfer">Pārskaitījums</option>
                  <option value="salary">Alga</option>
                  <option value="utilities">Komunālie</option>
                  <option value="shopping">Iepirkšanās</option>
                  <option value="other">Cits</option>
                </select>
              </label>

              <label htmlFor="tx-edit-description" className="block text-xs font-semibold uppercase tracking-wider text-bank-muted">
                Apraksts
                <textarea
                  id="tx-edit-description"
                  aria-label="Apraksts"
                  value={editDescription}
                  onChange={(event) => setEditDescription(sanitizePlainText(event.target.value, 240))}
                  maxLength={240}
                  rows={4}
                  className="mt-1 w-full resize-none rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={editSubmitting}
                  className="rounded-lg border border-bank-border px-3 py-2 text-sm font-semibold text-bank-ink transition hover:bg-bank-panel-soft disabled:opacity-50"
                >
                  Atcelt
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-bank-cosmic px-3 py-2 text-sm font-semibold text-white transition hover:bg-bank-cosmic-soft disabled:opacity-50"
                >
                  {editSubmitting ? 'Saglabā...' : 'Saglabāt izmaiņas'}
                </button>
              </div>
            </form>
          </article>
        </div>
      )}
    </section>
  );
}
