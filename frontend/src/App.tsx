import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { RefreshCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardAccountsView } from './components/dashboard/DashboardAccountsView';
import { DashboardAdminView } from './components/dashboard/DashboardAdminView';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { DashboardProfileView } from './components/dashboard/DashboardProfileView';
import { DashboardSidebar } from './components/dashboard/DashboardSidebar';
import { DashboardTopBar } from './components/dashboard/DashboardTopBar';
import { DashboardTransactionsView } from './components/dashboard/DashboardTransactionsView';
import { ToastViewport } from './components/common/ToastViewport';
import type { ToastItem, ToastType } from './components/common/ToastViewport';
import { AboutPage } from './components/public/AboutPage';
import { AuthPanel } from './components/public/AuthPanel';
import { BankLanding } from './components/public/BankLanding';
import { ContactPage } from './components/public/ContactPage';
import { CookiePage } from './components/public/CookiePage';
import { FaqPage } from './components/public/FaqPage';
import { LegalPage } from './components/public/LegalPage';
import { PrivacyPage } from './components/public/PrivacyPage';
import type {
  Account,
  AccountFilterState,
  AccountMember,
  AccountMemberRole,
  AdminFilterState,
  AdminMetrics,
  AdminUser,
  AdminUserEditState,
  AuthUser,
  DashboardView as View,
  MemberCandidate,
  MemberEditState,
  NewAccountState,
  NewMemberState,
  PaginatedResponse,
  Transaction,
  TransactionFilterState,
  TransferRecipient,
  TransactionStats,
  UserRole,
} from './lib/domain-types';
import api, { clearApiToken, extractApiError, getApiToken, setApiToken } from './lib/api';
import { resolvePublicAssetUrl } from './lib/media';
import {
  MAX_TRANSFER_AMOUNT,
  PERSON_NAME_PATTERN,
  STRONG_PASSWORD_PATTERN,
  sanitizeAccountName,
  sanitizePersonName,
} from './lib/validation';

function resolveLocaleTag(locale?: AuthUser['locale']): string {
  switch (locale) {
    case 'en':
      return 'en-GB';
    case 'sv':
      return 'sv-SE';
    case 'lv':
    default:
      return 'lv-LV';
  }
}

function formatMoney(
  amount: number | string,
  currency = 'EUR',
  localeTag = 'lv-LV',
  amountFormat: AuthUser['amount_format'] = 'local'
): string {
  const normalized = typeof amount === 'string' ? Number(amount) : amount;
  const moneyLocale = amountFormat === 'international' ? 'en-GB' : localeTag;

  return new Intl.NumberFormat(moneyLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(normalized) ? normalized : 0);
}

function formatDate(
  value: string | null,
  localeTag = 'lv-LV',
  timezone = 'Europe/Riga',
  dateFormat: AuthUser['date_format'] = 'dd.mm.yyyy'
): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const baseOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const withTimezone = { ...baseOptions, timeZone: timezone };
  const withoutTimezone = { ...baseOptions };

  let parts: Intl.DateTimeFormatPart[] = [];

  try {
    parts = new Intl.DateTimeFormat(localeTag, withTimezone).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat(localeTag, withoutTimezone).formatToParts(date);
  }

  const partMap: Record<string, string> = {};
  parts.forEach((part) => {
    partMap[part.type] = part.value;
  });

  const day = partMap.day ?? '--';
  const month = partMap.month ?? '--';
  const year = partMap.year ?? '----';
  const hour = partMap.hour ?? '00';
  const minute = partMap.minute ?? '00';

  const renderedDate =
    dateFormat === 'yyyy-mm-dd'
      ? `${year}-${month}-${day}`
      : dateFormat === 'mm/dd/yyyy'
        ? `${month}/${day}/${year}`
        : `${day}.${month}.${year}`;

  return `${renderedDate} ${hour}:${minute}`;
}

function isValidPersonName(value: string): boolean {
  return PERSON_NAME_PATTERN.test(value.trim().replace(/\s+/g, ' '));
}

function isStrongPassword(value: string): boolean {
  return STRONG_PASSWORD_PATTERN.test(value);
}

function compactNumber(value: number, localeTag = 'lv-LV'): string {
  return new Intl.NumberFormat(localeTag, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function hasRequiredProfileValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isProfileSetupComplete(profile: {
  address: string | null;
  phone: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
}): boolean {
  return [profile.address, profile.phone, profile.region, profile.country, profile.postal_code].every(hasRequiredProfileValue);
}

function transactionStatusLabel(status: Transaction['status']): string {
  switch (status) {
    case 'pending':
      return 'Gaida apstiprinājumu';
    case 'completed':
      return 'Izpildīts';
    case 'rejected':
      return 'Noraidīts';
    case 'failed':
      return 'Neizdevās';
    default:
      return status;
  }
}

function transactionStatusClasses(status: Transaction['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700';
    case 'completed':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-rose-100 text-rose-700';
    case 'failed':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-bank-panel-soft text-bank-muted';
  }
}

function memberRoleLabel(role: AccountMemberRole): string {
  switch (role) {
    case 'owner':
      return 'Īpašnieks';
    case 'viewer':
      return 'Skatītājs';
    case 'operator':
      return 'Operators';
    case 'approver':
      return 'Apstiprinātājs';
    default:
      return role;
  }
}

function accountStatusLabel(status: Account['status']): string {
  switch (status) {
    case 'active':
      return 'Aktīvs';
    case 'frozen':
      return 'Iesaldēts';
    case 'closed':
      return 'Aizvērts';
    default:
      return status;
  }
}

function accountTypeLabel(type: Account['type']): string {
  switch (type) {
    case 'personal':
      return 'Personīgais';
    case 'business':
      return 'Uzņēmuma';
    case 'savings':
      return 'Uzkrājumu';
    default:
      return type;
  }
}

function transactionCategoryLabel(category: Transaction['category']): string {
  switch (category) {
    case 'transfer':
      return 'Pārskaitījums';
    case 'salary':
      return 'Alga';
    case 'utilities':
      return 'Komunālie';
    case 'shopping':
      return 'Iepirkšanās';
    case 'other':
      return 'Cits';
    default:
      return category;
  }
}

const defaultAccountFilters: AccountFilterState = {
  q: '',
  status: '',
  type: '',
  currency: '',
  sort_by: 'created_at',
  sort_dir: 'desc',
};

const defaultTransactionFilters: TransactionFilterState = {
  q: '',
  account_id: '',
  status: '',
  category: '',
  amount_min: '',
  amount_max: '',
  date_from: '',
  date_to: '',
  sort_by: 'created_at',
  sort_dir: 'desc',
};

const defaultAdminFilters: AdminFilterState = {
  q: '',
  status: '',
  role_code: '',
  sort_by: 'created_at',
  sort_dir: 'desc',
};

type GuestScreen = 'home' | 'about' | 'contact' | 'faq' | 'terms' | 'privacy' | 'cookie' | 'auth';

const TRANSFER_FEE_PERCENT = 2.5;
const PREFERRED_CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'SEK', 'NOK'] as const;
const PREFERRED_LOCALE_OPTIONS = ['lv', 'en', 'sv'] as const;
const PREFERRED_TIMEZONE_OPTIONS = ['Europe/Riga', 'Europe/Stockholm', 'Europe/London', 'UTC'] as const;
const PREFERRED_DATE_FORMAT_OPTIONS = ['dd.mm.yyyy', 'yyyy-mm-dd', 'mm/dd/yyyy'] as const;
const PREFERRED_AMOUNT_FORMAT_OPTIONS = ['local', 'international'] as const;
const PREFERRED_DASHBOARD_VIEW_OPTIONS = ['overview', 'accounts', 'transactions'] as const;

type DialogTone = 'default' | 'warning' | 'danger';

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: DialogTone;
  resolve: (confirmed: boolean) => void;
}

interface PromptDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  placeholder?: string;
  maxLength: number;
  resolve: (value: string | null) => void;
}

interface TwoFactorSetupPayload {
  issuer: string;
  label: string;
  secret: string;
  otpauth_url: string;
  app_hint: string;
}

interface TwoFactorSetupSession {
  email: string;
  setup: TwoFactorSetupPayload;
}

interface TwoFactorChallengeSession {
  email: string;
  ticket: string;
}

function resolveGuestScreen(pathname: string): GuestScreen {
  if (pathname === '/about') {
    return 'about';
  }

  if (pathname === '/contact') {
    return 'contact';
  }

  if (pathname === '/faq') {
    return 'faq';
  }

  if (pathname === '/terms' || pathname === '/legal') {
    return 'terms';
  }

  if (pathname === '/privacy') {
    return 'privacy';
  }

  if (pathname === '/cookies') {
    return 'cookie';
  }

  if (pathname === '/auth') {
    return 'auth';
  }

  return 'home';
}

function App() {
  const [activeView, setActiveView] = useState<View>('overview');
  const [initializedViewUserId, setInitializedViewUserId] = useState<number | null>(null);
  const [guestScreen, setGuestScreen] = useState<GuestScreen>(() => {
    if (typeof window === 'undefined') {
      return 'home';
    }

    return resolveGuestScreen(window.location.pathname);
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    preferred_currency: 'EUR',
    locale: 'lv' as AuthUser['locale'],
    timezone: 'Europe/Riga',
    date_format: 'dd.mm.yyyy' as AuthUser['date_format'],
    amount_format: 'local' as AuthUser['amount_format'],
    address: '',
    phone: '',
    region: '',
    country: 'LV',
    postal_code: '',
    phone_country: '+371',
    theme_mode: 'light' as AuthUser['theme_mode'],
    email_notifications: true,
    push_notifications: true,
    marketing_notifications: false,
    compact_mode: false,
    default_dashboard_view: 'overview' as AuthUser['default_dashboard_view'],
    mask_balances: false,
    require_payment_confirmation: true,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profilePictureUploading, setProfilePictureUploading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [twoFactorSetupSession, setTwoFactorSetupSession] = useState<TwoFactorSetupSession | null>(null);
  const [twoFactorChallengeSession, setTwoFactorChallengeSession] = useState<TwoFactorChallengeSession | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountsPage, setAccountsPage] = useState<PaginatedResponse<Account> | null>(null);
  const [accountPage, setAccountPage] = useState(1);
  const [accountFiltersDraft, setAccountFiltersDraft] = useState<AccountFilterState>(defaultAccountFilters);
  const [accountFilters, setAccountFilters] = useState<AccountFilterState>(defaultAccountFilters);
  const [newAccount, setNewAccount] = useState<NewAccountState>({
    name: '',
    currency: 'EUR',
    type: 'personal',
  });
  const [createAccountLoading, setCreateAccountLoading] = useState(false);
  const [memberPanelAccountId, setMemberPanelAccountId] = useState<number | null>(null);
  const [accountMembers, setAccountMembers] = useState<AccountMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersNotice, setMembersNotice] = useState<string | null>(null);
  const [createMemberLoading, setCreateMemberLoading] = useState(false);
  const [memberActionLoadingId, setMemberActionLoadingId] = useState<number | null>(null);
  const [newMemberForm, setNewMemberForm] = useState<NewMemberState>({
    user_id: '',
    member_role: 'viewer',
    daily_limit: '',
  });
  const [memberCandidateQuery, setMemberCandidateQuery] = useState('');
  const [memberCandidates, setMemberCandidates] = useState<MemberCandidate[]>([]);
  const [memberCandidatesLoading, setMemberCandidatesLoading] = useState(false);
  const [memberCandidateSearchAttempted, setMemberCandidateSearchAttempted] = useState(false);
  const [memberEdits, setMemberEdits] = useState<Record<number, MemberEditState>>({});

  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionsPageData, setTransactionsPageData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionFiltersDraft, setTransactionFiltersDraft] = useState<TransactionFilterState>(defaultTransactionFilters);
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilterState>(defaultTransactionFilters);
  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    recipient_query: '',
    amount: '',
    fee: '0.00',
    category: 'transfer' as Transaction['category'],
    description: '',
  });
  const [transferRecipientOptions, setTransferRecipientOptions] = useState<TransferRecipient[]>([]);
  const [transferRecipientOptionsLoading, setTransferRecipientOptionsLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transactionsNotice, setTransactionsNotice] = useState<string | null>(null);
  const [transactionActionLoadingId, setTransactionActionLoadingId] = useState<number | null>(null);
  const [approvalQueueLoading, setApprovalQueueLoading] = useState(false);
  const [approvalQueueError, setApprovalQueueError] = useState<string | null>(null);
  const [approvalQueueData, setApprovalQueueData] = useState<PaginatedResponse<Transaction> | null>(null);
  const [transactionsInitialSection, setTransactionsInitialSection] = useState<'history' | 'payment' | 'approvals'>('history');

  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null);
  const [adminUsersNotice, setAdminUsersNotice] = useState<string | null>(null);
  const [adminUsersPageData, setAdminUsersPageData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [adminUsersPage, setAdminUsersPage] = useState(1);
  const [adminFiltersDraft, setAdminFiltersDraft] = useState<AdminFilterState>(defaultAdminFilters);
  const [adminFilters, setAdminFilters] = useState<AdminFilterState>(defaultAdminFilters);
  const [adminRoles, setAdminRoles] = useState<UserRole[]>([]);
  const [adminRoleLoadError, setAdminRoleLoadError] = useState<string | null>(null);
  const [adminUserActionLoadingId, setAdminUserActionLoadingId] = useState<number | null>(null);
  const [adminUserEdits, setAdminUserEdits] = useState<Record<number, AdminUserEditState>>({});
  const [adminMetricsLoading, setAdminMetricsLoading] = useState(false);
  const [adminMetricsError, setAdminMetricsError] = useState<string | null>(null);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);

  const [statsLoading, setStatsLoading] = useState(false);
  const [statsData, setStatsData] = useState<TransactionStats | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [promptDialog, setPromptDialog] = useState<PromptDialogState | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const accounts = useMemo(() => accountsPage?.data ?? [], [accountsPage]);
  const transactions = useMemo(() => transactionsPageData?.data ?? [], [transactionsPageData]);
  const approvalQueue = useMemo(() => approvalQueueData?.data ?? [], [approvalQueueData]);
  const adminUsers = useMemo(() => adminUsersPageData?.data ?? [], [adminUsersPageData]);

  const isAdmin = user?.role?.code === 'admin';
  const localeTag = useMemo(() => resolveLocaleTag(user?.locale), [user?.locale]);
  const formatMoneyForUser = useCallback(
    (amount: number | string, currency?: string) => {
      const resolvedCurrency = currency ?? user?.preferred_currency ?? 'EUR';

      if (user?.mask_balances) {
        return `•••• ${resolvedCurrency}`;
      }

      return formatMoney(amount, resolvedCurrency, localeTag, user?.amount_format ?? 'local');
    },
    [localeTag, user?.amount_format, user?.mask_balances, user?.preferred_currency]
  );
  const formatDateForUser = useCallback(
    (value: string | null) =>
      formatDate(value, localeTag, user?.timezone ?? 'Europe/Riga', user?.date_format ?? 'dd.mm.yyyy'),
    [localeTag, user?.date_format, user?.timezone]
  );
  const compactNumberForUser = useCallback((value: number) => compactNumber(value, localeTag), [localeTag]);
  const headerDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(localeTag, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: user?.timezone ?? 'Europe/Riga',
      }).format(new Date());
    } catch {
      return new Intl.DateTimeFormat('lv-LV').format(new Date());
    }
  }, [localeTag, user?.timezone]);

  const accountOptions = useMemo(
    () => accounts.filter((account) => account.status === 'active' && account.can_initiate_transfer !== false),
    [accounts]
  );

  const accountMap = useMemo(() => {
    const map = new Map<number, Account>();
    accounts.forEach((account) => map.set(account.id, account));
    return map;
  }, [accounts]);

  const transferRecipientMap = useMemo(() => {
    const map = new Map<number, TransferRecipient>();
    transferRecipientOptions.forEach((recipient) => map.set(recipient.id, recipient));
    return map;
  }, [transferRecipientOptions]);

  const selectedMemberAccount = useMemo(
    () => accounts.find((account) => account.id === memberPanelAccountId) ?? null,
    [accounts, memberPanelAccountId]
  );

  const canManageSelectedMembers = useMemo(() => {
    if (!user || !selectedMemberAccount) {
      return false;
    }

    if (isAdmin) {
      return true;
    }

    return selectedMemberAccount.owner_user_id === user.id;
  }, [isAdmin, selectedMemberAccount, user]);

  const canEditSelectedMembers = canManageSelectedMembers && selectedMemberAccount?.status !== 'closed';

  const canApproveTransaction = useCallback(
    (tx: Transaction): boolean => {
      if (!user || tx.status !== 'pending') {
        return false;
      }

      if (isAdmin) {
        return true;
      }

      const sourceAccount = accountMap.get(tx.from_account_id);

      return ['owner', 'operator', 'approver'].includes(sourceAccount?.access_role ?? '');
    },
    [accountMap, isAdmin, user]
  );

  const approvableTransactions = useMemo(
    () => approvalQueue.filter((tx) => canApproveTransaction(tx)),
    [approvalQueue, canApproveTransaction]
  );

  const sidebarStatusSummary = useMemo(
    () => ({
      pendingApprovals: approvableTransactions.length,
      pendingUsers: isAdmin ? adminMetrics?.users.pending ?? 0 : 0,
      totalTransactions: statsData
        ? Object.values(statsData.transactions_by_status).reduce((sum, value) => sum + value, 0)
        : 0,
      completedTransactions: statsData?.transactions_by_status.completed ?? 0,
      openIssues: [
        accountsError,
        transactionsError,
        approvalQueueError,
        membersError,
        adminUsersError,
        adminRoleLoadError,
        adminMetricsError,
      ]
        .filter(Boolean)
        .length,
    }),
    [
      approvableTransactions.length,
      isAdmin,
      adminMetrics,
      statsData,
      accountsError,
      transactionsError,
      approvalQueueError,
      membersError,
      adminUsersError,
      adminRoleLoadError,
      adminMetricsError,
    ]
  );

  const monthlyActivityRows = useMemo(() => {
    if (!statsData) {
      return [] as Array<[string, number]>;
    }

    const activityEntries = Object.entries(statsData.monthly_activity ?? {});
    const recentEntries = Object.entries(statsData.recent_activity ?? {});
    if (recentEntries.length > 0) {
      return recentEntries;
    }

    if (activityEntries.length > 0) {
      return activityEntries;
    }

    return Object.entries(statsData.monthly_net ?? {});
  }, [statsData]);

  const profileSetupLocked = useMemo(() => {
    if (!user) {
      return false;
    }

    // Admin accounts should never be locked by profile setup requirements
    if (user.role?.code === 'admin') {
      return false;
    }

    return !isProfileSetupComplete({
      address: user.address,
      phone: user.phone,
      region: user.region,
      country: user.country,
      postal_code: user.postal_code,
    });
  }, [user]);

  const accountNeedsRevision = useMemo(() => {
    if (!user) {
      return false;
    }

    return Boolean(user.revision_requested_at);
  }, [user]);

  const accountPendingApproval = useMemo(() => {
    if (!user || profileSetupLocked) {
      return false;
    }
    // Admins are always considered approved/unlocked
    if (user.role?.code === 'admin') {
      return false;
    }
    // Use explicit status field for pending approval (backend-driven)
    return user.status === 'pending';
  }, [user, profileSetupLocked]);

  const userBlocked = useMemo(() => {
    if (!user) {
      return false;
    }

    return user.status === 'blocked';
  }, [user]);

  const handleDashboardViewChange = useCallback(
    (nextView: View) => {
      if (userBlocked && nextView !== 'settings') {
        setActiveView('settings');
        return;
      }

      if (profileSetupLocked && nextView !== 'settings') {
        setActiveView('settings');
        return;
      }

      if (accountPendingApproval && nextView !== 'settings') {
        setActiveView('settings');
        return;
      }

      setActiveView(nextView);
    },
    [profileSetupLocked, accountPendingApproval, userBlocked]
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (type: ToastType, message: string) => {
      const normalizedMessage = message.trim();

      if (
        normalizedMessage.startsWith('Aizpildi profila iestatījumus') ||
        normalizedMessage.startsWith('Konts gaida administratora apstiprinājumu') ||
        normalizedMessage.startsWith('Jūsu konts gaida administratora apstiprinājumu') ||
        normalizedMessage.startsWith('Konts ir bloķēts')
      ) {
        return;
      }

      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, type, message }]);

      window.setTimeout(() => {
        dismissToast(id);
      }, 5000);
    },
    [dismissToast]
  );

  const requestConfirmation = useCallback(
    (options: { title: string; message: string; confirmLabel?: string; tone?: DialogTone }) => {
      return new Promise<boolean>((resolve) => {
        setConfirmDialog({
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel,
          tone: options.tone ?? 'default',
          resolve,
        });
      });
    },
    []
  );

  const requestTextInput = useCallback(
    (options: {
      title: string;
      message: string;
      initialValue: string;
      confirmLabel?: string;
      placeholder?: string;
      maxLength?: number;
    }) => {
      return new Promise<string | null>((resolve) => {
        setPromptValue(options.initialValue);
        setPromptDialog({
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel,
          placeholder: options.placeholder,
          maxLength: options.maxLength ?? 120,
          resolve,
        });
      });
    },
    []
  );

  const closeConfirmDialog = useCallback((confirmed: boolean) => {
    setConfirmDialog((current) => {
      if (current) {
        current.resolve(confirmed);
      }

      return null;
    });
  }, []);

  const resolvePromptDialog = useCallback((value: string | null) => {
    setPromptDialog((current) => {
      if (current) {
        current.resolve(value);
      }

      return null;
    });
    setPromptValue('');
  }, []);

  useEffect(() => {
    if (profileNotice) {
      pushToast('success', profileNotice);
    }
  }, [profileNotice, pushToast]);

  useEffect(() => {
    if (profileError) {
      pushToast('error', profileError);
    }
  }, [profileError, pushToast]);

  useEffect(() => {
    if (passwordNotice) {
      pushToast('success', passwordNotice);
    }
  }, [passwordNotice, pushToast]);

  useEffect(() => {
    if (passwordError) {
      pushToast('error', passwordError);
    }
  }, [passwordError, pushToast]);

  useEffect(() => {
    if (transactionsNotice) {
      pushToast('success', transactionsNotice);
    }
  }, [transactionsNotice, pushToast]);

  useEffect(() => {
    if (transactionsError) {
      pushToast('error', transactionsError);
    }
  }, [transactionsError, pushToast]);

  useEffect(() => {
    if (accountsError) {
      pushToast('error', accountsError);
    }
  }, [accountsError, pushToast]);

  useEffect(() => {
    if (approvalQueueError) {
      pushToast('error', approvalQueueError);
    }
  }, [approvalQueueError, pushToast]);

  useEffect(() => {
    if (membersNotice) {
      pushToast('success', membersNotice);
    }
  }, [membersNotice, pushToast]);

  useEffect(() => {
    if (membersError) {
      pushToast('error', membersError);
    }
  }, [membersError, pushToast]);

  useEffect(() => {
    if (adminUsersNotice) {
      pushToast('success', adminUsersNotice);
    }
  }, [adminUsersNotice, pushToast]);

  useEffect(() => {
    if (adminUsersError) {
      pushToast('error', adminUsersError);
    }
  }, [adminUsersError, pushToast]);

  useEffect(() => {
    if (adminRoleLoadError) {
      pushToast('error', adminRoleLoadError);
    }
  }, [adminRoleLoadError, pushToast]);

  useEffect(() => {
    if (adminMetricsError) {
      pushToast('error', adminMetricsError);
    }
  }, [adminMetricsError, pushToast]);

  useEffect(() => {
    if (!authError) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAuthError(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [authError]);

  useEffect(() => {
    if (!confirmDialog && !promptDialog) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (promptDialog) {
        resolvePromptDialog(null);
        return;
      }

      if (confirmDialog) {
        closeConfirmDialog(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeConfirmDialog, confirmDialog, promptDialog, resolvePromptDialog]);

  const fetchSession = useCallback(async () => {
    if (!getApiToken()) {
      setSessionLoading(false);
      return;
    }

    try {
      const response = await api.get<{ user: AuthUser }>('/auth/me');
      const sessionUser = response.data.user;

      if (!sessionUser.two_factor_enabled) {
        const setupResponse = await api.post<{ two_factor_setup: TwoFactorSetupPayload }>('/auth/2fa/setup');
        setTwoFactorSetupSession({
          email: sessionUser.email,
          setup: setupResponse.data.two_factor_setup,
        });
        setTwoFactorChallengeSession(null);
        setUser(null);
        return;
      }

      setTwoFactorSetupSession(null);
      setTwoFactorChallengeSession(null);
      setUser(sessionUser);
    } catch {
      clearApiToken();
      setUser(null);
      setTwoFactorSetupSession(null);
      setTwoFactorChallengeSession(null);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    if (!user) {
      setProfileForm({
        name: '',
        email: '',
        preferred_currency: 'EUR',
        locale: 'lv',
        timezone: 'Europe/Riga',
        date_format: 'dd.mm.yyyy',
        amount_format: 'local',
        address: '',
        phone: '',
        region: '',
        country: 'LV',
        postal_code: '',
        phone_country: '+371',
        theme_mode: 'light',
        email_notifications: true,
        push_notifications: true,
        marketing_notifications: false,
        compact_mode: false,
        default_dashboard_view: 'overview',
        mask_balances: false,
        require_payment_confirmation: true,
      });
      setProfileNotice(null);
      setProfileError(null);
      setInitializedViewUserId(null);
      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
      setPasswordNotice(null);
      setPasswordError(null);
      return;
    }

    setProfileForm({
      name: user.name ?? '',
      email: user.email ?? '',
      preferred_currency: user.preferred_currency ?? 'EUR',
      locale: user.locale ?? 'lv',
      timezone: user.timezone ?? 'Europe/Riga',
      date_format: user.date_format ?? 'dd.mm.yyyy',
      amount_format: user.amount_format ?? 'local',
      email_notifications: user.email_notifications ?? true,
      push_notifications: user.push_notifications ?? true,
      marketing_notifications: user.marketing_notifications ?? false,
      compact_mode: user.compact_mode ?? false,
      default_dashboard_view: user.default_dashboard_view ?? 'overview',
      mask_balances: user.mask_balances ?? false,
      require_payment_confirmation: user.require_payment_confirmation ?? true,
      address: user.address ?? '',
      phone: user.phone ?? '',
      region: user.region ?? '',
      country: user.country ?? 'LV',
      postal_code: user.postal_code ?? '',
      phone_country: user.phone_country ?? '+371',
      theme_mode: user.theme_mode ?? 'light',
    });
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.theme = user?.theme_mode ?? 'light';
  }, [user?.theme_mode]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (initializedViewUserId === user.id) {
      return;
    }

    if (profileSetupLocked || accountPendingApproval || accountNeedsRevision || userBlocked) {
      setActiveView('settings');
    } else {
      setActiveView(user.default_dashboard_view ?? 'overview');
    }
    setInitializedViewUserId(user.id);
  }, [accountNeedsRevision, accountPendingApproval, initializedViewUserId, profileSetupLocked, user, userBlocked]);

  useEffect(() => {
    if (user) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
        window.history.replaceState({}, '', '/dashboard');
      }

      return;
    }

    const handlePopState = () => {
      setGuestScreen(resolveGuestScreen(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user]);

  const fetchAccounts = useCallback(async () => {
    if (!user) {
      return;
    }

    setAccountsLoading(true);
    setAccountsError(null);

    try {
      const params: Record<string, string | number> = {
        page: accountPage,
        per_page: 50,
        sort_by: accountFilters.sort_by,
        sort_dir: accountFilters.sort_dir,
      };

      if (accountFilters.q) params.q = accountFilters.q;
      if (accountFilters.status) params.status = accountFilters.status;
      if (accountFilters.type) params.type = accountFilters.type;
      if (accountFilters.currency) params.currency = accountFilters.currency;

      const response = await api.get<PaginatedResponse<Account>>('/accounts', { params });
      setAccountsPage(response.data);
    } catch (error) {
      setAccountsError(extractApiError(error, 'Neizdevās ielādēt kontus.'));
    } finally {
      setAccountsLoading(false);
    }
  }, [accountFilters, accountPage, user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      return;
    }

    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      const params: Record<string, string | number> = {
        page: transactionPage,
        per_page: 30,
        sort_by: transactionFilters.sort_by,
        sort_dir: transactionFilters.sort_dir,
      };

      if (transactionFilters.q) params.q = transactionFilters.q;
      if (transactionFilters.account_id) params.account_id = transactionFilters.account_id;
      if (transactionFilters.status) params.status = transactionFilters.status;
      if (transactionFilters.category) params.category = transactionFilters.category;
      if (transactionFilters.amount_min) params.amount_min = transactionFilters.amount_min;
      if (transactionFilters.amount_max) params.amount_max = transactionFilters.amount_max;
      if (transactionFilters.date_from) params.date_from = transactionFilters.date_from;
      if (transactionFilters.date_to) params.date_to = transactionFilters.date_to;

      const response = await api.get<PaginatedResponse<Transaction>>('/transactions', { params });
      setTransactionsPageData(response.data);
    } catch (error) {
      setTransactionsError(extractApiError(error, 'Neizdevās ielādēt transakcijas.'));
    } finally {
      setTransactionsLoading(false);
    }
  }, [transactionFilters, transactionPage, user]);

  const fetchTransferRecipients = useCallback(async () => {
    if (!user) {
      setTransferRecipientOptions([]);
      setTransferRecipientOptionsLoading(false);
      return;
    }

    setTransferRecipientOptionsLoading(true);

    try {
      const response = await api.get<{ recipients: TransferRecipient[] }>('/transactions/recipients', {
        params: { limit: 1000 },
      });
      setTransferRecipientOptions(response.data.recipients ?? []);
    } catch {
      setTransferRecipientOptions([]);
    } finally {
      setTransferRecipientOptionsLoading(false);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) {
      return;
    }

    setStatsLoading(true);

    try {
      const response = await api.get<TransactionStats>('/transactions/stats');
      setStatsData(response.data);
    } catch {
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  const fetchApprovalQueue = useCallback(async () => {
    if (!user) {
      return;
    }

    setApprovalQueueLoading(true);
    setApprovalQueueError(null);

    try {
      const response = await api.get<PaginatedResponse<Transaction>>('/transactions', {
        params: {
          status: 'pending',
          sort_by: 'created_at',
          sort_dir: 'desc',
          per_page: 20,
          page: 1,
        },
      });
      setApprovalQueueData(response.data);
    } catch (error) {
      setApprovalQueueError(extractApiError(error, 'Neizdevās ielādēt apstiprināšanas rindu.'));
    } finally {
      setApprovalQueueLoading(false);
    }
  }, [user]);

  const fetchAccountMembers = useCallback(async () => {
    if (!user || !memberPanelAccountId) {
      return;
    }

    setMembersLoading(true);
    setMembersError(null);

    try {
      const response = await api.get<{ members: AccountMember[] }>(`/accounts/${memberPanelAccountId}/members`);
      const members = response.data.members;
      setAccountMembers(members);

      const nextEdits: Record<number, MemberEditState> = {};
      members.forEach((member) => {
        if (member.member_role === 'owner') {
          return;
        }

        nextEdits[member.id] = {
          member_role: member.member_role,
          daily_limit: member.daily_limit ?? '',
        };
      });
      setMemberEdits(nextEdits);
    } catch (error) {
      setMembersError(extractApiError(error, 'Neizdevās ielādēt konta dalībniekus.'));
      setAccountMembers([]);
      setMemberEdits({});
    } finally {
      setMembersLoading(false);
    }
  }, [memberPanelAccountId, user]);

  const fetchAdminUsers = useCallback(async () => {
    if (!user || !isAdmin) {
      setAdminUsersPageData(null);
      setAdminUsersError(null);
      setAdminUsersNotice(null);
      setAdminUserEdits({});
      return;
    }

    setAdminUsersLoading(true);
    setAdminUsersError(null);

    try {
      const params: Record<string, string | number> = {
        page: adminUsersPage,
        per_page: 20,
        sort_by: adminFilters.sort_by,
        sort_dir: adminFilters.sort_dir,
      };

      if (adminFilters.q) params.q = adminFilters.q;
      if (adminFilters.status) params.status = adminFilters.status;
      if (adminFilters.role_code) params.role_code = adminFilters.role_code;

      const response = await api.get<PaginatedResponse<AdminUser>>('/admin/users', { params });
      const usersPage = response.data;
      setAdminUsersPageData(usersPage);

      const nextEdits: Record<number, AdminUserEditState> = {};
      usersPage.data.forEach((managedUser) => {
        nextEdits[managedUser.id] = {
          role_id: managedUser.role?.id ? String(managedUser.role.id) : '',
          status: managedUser.status,
        };
      });
      setAdminUserEdits(nextEdits);
    } catch (error) {
      setAdminUsersError(extractApiError(error, 'Neizdevās ielādēt lietotājus.'));
      setAdminUsersPageData(null);
      setAdminUserEdits({});
    } finally {
      setAdminUsersLoading(false);
    }
  }, [adminFilters, adminUsersPage, isAdmin, user]);

  const fetchAdminRoles = useCallback(async () => {
    if (!user || !isAdmin) {
      setAdminRoles([]);
      setAdminRoleLoadError(null);
      return;
    }

    setAdminRoleLoadError(null);

    try {
      const response = await api.get<{ roles: UserRole[] }>('/admin/roles');
      setAdminRoles(response.data.roles);
    } catch (error) {
      setAdminRoleLoadError(extractApiError(error, 'Neizdevās ielādēt lomu sarakstu.'));
      setAdminRoles([]);
    }
  }, [isAdmin, user]);

  const fetchAdminMetrics = useCallback(async () => {
    if (!user || !isAdmin) {
      setAdminMetricsLoading(false);
      setAdminMetrics(null);
      setAdminMetricsError(null);
      return;
    }

    setAdminMetricsLoading(true);
    setAdminMetricsError(null);

    try {
      const response = await api.get<AdminMetrics>('/admin/metrics');
      setAdminMetrics(response.data);
    } catch (error) {
      setAdminMetricsError(extractApiError(error, 'Neizdevās ielādēt administratora metriku datus.'));
      setAdminMetrics(null);
    } finally {
      setAdminMetricsLoading(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    void fetchTransferRecipients();
  }, [fetchTransferRecipients]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    void fetchApprovalQueue();
  }, [fetchApprovalQueue]);

  useEffect(() => {
    void fetchAdminUsers();
  }, [fetchAdminUsers]);

  useEffect(() => {
    void fetchAdminRoles();
  }, [fetchAdminRoles]);

  useEffect(() => {
    void fetchAdminMetrics();
  }, [fetchAdminMetrics]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchStats();
      void fetchApprovalQueue();

      if (activeView === 'overview') {
        void fetchAccounts();
        if (isAdmin) {
          void fetchAdminMetrics();
        }
        return;
      }

      if (activeView === 'accounts') {
        void fetchAccounts();
        if (memberPanelAccountId) {
          void fetchAccountMembers();
        }
        return;
      }

      if (activeView === 'transactions') {
        void fetchTransactions();
        void fetchTransferRecipients();
        return;
      }

      if (activeView === 'admin' && isAdmin) {
        void fetchAdminUsers();
        void fetchAdminMetrics();
      }
    }, 45000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    activeView,
    fetchAccountMembers,
    fetchAccounts,
    fetchAdminMetrics,
    fetchAdminUsers,
    fetchApprovalQueue,
    fetchStats,
    fetchTransferRecipients,
    fetchTransactions,
    isAdmin,
    memberPanelAccountId,
    user,
  ]);

  useEffect(() => {
    if (!memberPanelAccountId) {
      setAccountMembers([]);
      setMemberEdits({});
      setMembersError(null);
      setMembersNotice(null);
      setMemberCandidateQuery('');
      setMemberCandidates([]);
      setMemberCandidatesLoading(false);
      return;
    }

    void fetchAccountMembers();
  }, [fetchAccountMembers, memberPanelAccountId]);

  useEffect(() => {
    if (!memberPanelAccountId) {
      return;
    }

    const accountStillVisible = accounts.some((account) => account.id === memberPanelAccountId);
    if (!accountStillVisible) {
      setMemberPanelAccountId(null);
      setAccountMembers([]);
      setMemberEdits({});
      setMembersNotice(null);
      setMembersError(null);
    }
  }, [accounts, memberPanelAccountId]);

  useEffect(() => {
    if (activeView === 'admin' && !isAdmin) {
      setActiveView('overview');
    }
  }, [activeView, isAdmin]);

  useEffect(() => {
    if (!profileSetupLocked) {
      return;
    }

    if (activeView !== 'settings') {
      setActiveView('settings');
    }
  }, [activeView, profileSetupLocked]);

  const navigateGuest = useCallback((nextScreen: GuestScreen) => {
    setGuestScreen(nextScreen);

    if (typeof window === 'undefined') {
      return;
    }

    const resetScrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const nextPath =
      nextScreen === 'home'
        ? '/'
        : nextScreen === 'about'
          ? '/about'
          : nextScreen === 'contact'
            ? '/contact'
            : nextScreen === 'faq'
              ? '/faq'
              : nextScreen === 'terms'
                ? '/terms'
                : nextScreen === 'privacy'
                  ? '/privacy'
                  : nextScreen === 'cookie'
                    ? '/cookies'
                : '/auth';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }

    resetScrollTop();
    window.requestAnimationFrame(resetScrollTop);
  }, []);

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchAccounts(),
      fetchTransactions(),
      fetchTransferRecipients(),
      fetchApprovalQueue(),
      fetchStats(),
      fetchAccountMembers(),
      fetchAdminUsers(),
      fetchAdminMetrics(),
    ]);
  }, [
    fetchAccounts,
    fetchTransactions,
    fetchTransferRecipients,
    fetchApprovalQueue,
    fetchStats,
    fetchAccountMembers,
    fetchAdminUsers,
    fetchAdminMetrics,
  ]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const response = await api.post<{
          token?: string;
          user?: AuthUser;
          requires_two_factor?: boolean;
          two_factor_ticket?: string;
        }>('/auth/login', loginData);

        if (response.data.requires_two_factor && response.data.two_factor_ticket) {
          setTwoFactorChallengeSession({
            email: loginData.email,
            ticket: response.data.two_factor_ticket,
          });
          setTwoFactorSetupSession(null);
          setTwoFactorCode('');
        } else if (response.data.token && response.data.user) {
          setApiToken(response.data.token);
          setUser(response.data.user);
          setTwoFactorChallengeSession(null);
          setTwoFactorSetupSession(null);
        } else {
          setAuthError('Neizdevās uzsākt pieslēgšanos. Mēģini vēlreiz.');
        }
      } else {
        const trimmedRegisterName = sanitizePersonName(registerData.name).trim();

        if (!isValidPersonName(trimmedRegisterName)) {
          setAuthError('Vārdam un uzvārdam jābūt diviem vārdiem, tikai ar burtiem un ne garākam par 20 simboliem.');
          setAuthLoading(false);
          return;
        }

        if (!isStrongPassword(registerData.password)) {
          setAuthError('Parolei jābūt vismaz 8 simbolus garai, ar vienu lielo burtu, vienu mazo burtu un vienu ciparu.');
          setAuthLoading(false);
          return;
        }

        const response = await api.post<{
          token: string;
          user: AuthUser;
          two_factor_setup: TwoFactorSetupPayload;
        }>('/auth/register', { ...registerData, name: trimmedRegisterName });

        setApiToken(response.data.token);
        setTwoFactorSetupSession({
          email: response.data.user.email,
          setup: response.data.two_factor_setup,
        });
        setTwoFactorChallengeSession(null);
        setTwoFactorCode('');
        setUser(null);
      }

      setGuestScreen('auth');
      setAuthError(null);
    } catch (error) {
      setAuthError(extractApiError(error, 'Neizdevās autentificēties.'));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleTwoFactorSetupConfirm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const response = await api.post<{ message?: string; user: AuthUser }>('/auth/2fa/enable', {
        code: twoFactorCode,
      });

      setTwoFactorSetupSession(null);
      setTwoFactorCode('');
      setUser(response.data.user);
      setAuthMode('login');
      setAuthError(null);
    } catch (error) {
      setAuthError(extractApiError(error, 'Neizdevās apstiprināt autentifikatora kodu.'));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleTwoFactorLoginConfirm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!twoFactorChallengeSession) {
      return;
    }

    setAuthError(null);
    setAuthLoading(true);

    try {
      const response = await api.post<{ token: string; user: AuthUser }>('/auth/2fa/challenge', {
        ticket: twoFactorChallengeSession.ticket,
        code: twoFactorCode,
      });

      setApiToken(response.data.token);
      setTwoFactorChallengeSession(null);
      setTwoFactorCode('');
      setUser(response.data.user);
      setAuthError(null);
    } catch (error) {
      setAuthError(extractApiError(error, 'Neizdevās apstiprināt 2FA kodu.'));
    } finally {
      setAuthLoading(false);
    }
  }

  function handleCancelTwoFactorFlow(): void {
    setTwoFactorChallengeSession(null);
    setTwoFactorSetupSession(null);
    setTwoFactorCode('');
    setAuthMode('login');
    clearApiToken();
    setUser(null);
    navigateGuest('home');
  }

  function handleSkipTwoFactorSetup(): void {
    setTwoFactorSetupSession(null);
    setTwoFactorCode('');
    setAuthMode('login');
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!user) {
      return;
    }

    const trimmedName = profileForm.name.trim();
    const trimmedEmail = user.email.trim();
    const normalizedCurrency = profileForm.preferred_currency.trim().toUpperCase();
    const normalizedLocale = profileForm.locale;
    const normalizedTimezone = profileForm.timezone;
    const normalizedDateFormat = profileForm.date_format;
    const normalizedAmountFormat = profileForm.amount_format;
    const normalizedDashboardView = profileForm.default_dashboard_view;
    const normalizedThemeMode = profileForm.theme_mode;

    if (!isValidPersonName(trimmedName)) {
      setProfileError('Vārdam un uzvārdam jābūt diviem vārdiem, tikai ar burtiem un ne garākam par 20 simboliem.');
      return;
    }

    if (!PREFERRED_CURRENCY_OPTIONS.includes(normalizedCurrency as (typeof PREFERRED_CURRENCY_OPTIONS)[number])) {
      setProfileError('Izvēlies atbalstītu primāro valūtu.');
      return;
    }

    if (!PREFERRED_LOCALE_OPTIONS.includes(normalizedLocale as (typeof PREFERRED_LOCALE_OPTIONS)[number])) {
      setProfileError('Izvēlies atbalstītu lietotnes valodu.');
      return;
    }

    if (!PREFERRED_TIMEZONE_OPTIONS.includes(normalizedTimezone as (typeof PREFERRED_TIMEZONE_OPTIONS)[number])) {
      setProfileError('Izvēlies atbalstītu laika zonu.');
      return;
    }

    if (
      !PREFERRED_DATE_FORMAT_OPTIONS.includes(
        normalizedDateFormat as (typeof PREFERRED_DATE_FORMAT_OPTIONS)[number]
      )
    ) {
      setProfileError('Izvēlies atbalstītu datuma formātu.');
      return;
    }

    if (
      !PREFERRED_AMOUNT_FORMAT_OPTIONS.includes(
        normalizedAmountFormat as (typeof PREFERRED_AMOUNT_FORMAT_OPTIONS)[number]
      )
    ) {
      setProfileError('Izvēlies atbalstītu summu formātu.');
      return;
    }

    if (
      !PREFERRED_DASHBOARD_VIEW_OPTIONS.includes(
        normalizedDashboardView as (typeof PREFERRED_DASHBOARD_VIEW_OPTIONS)[number]
      )
    ) {
      setProfileError('Izvēlies atbalstītu sākuma sadaļu.');
      return;
    }

    if (!['light', 'dark'].includes(normalizedThemeMode)) {
      setProfileError('Izvēlies atbalstītu izskata režīmu.');
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileNotice(null);

    try {
      const response = await api.patch<{ message?: string; user: AuthUser }>('/auth/profile', {
        name: trimmedName,
        email: trimmedEmail,
        preferred_currency: normalizedCurrency,
        locale: normalizedLocale,
        timezone: normalizedTimezone,
        date_format: normalizedDateFormat,
        amount_format: normalizedAmountFormat,
        address: profileForm.address.trim() || null,
        phone: profileForm.phone.trim() || null,
        region: profileForm.region.trim() || null,
        country: profileForm.country.trim().toUpperCase() || null,
        postal_code: profileForm.postal_code.trim() || null,
        phone_country: profileForm.phone_country.trim() || '+371',
        theme_mode: normalizedThemeMode,
        email_notifications: profileForm.email_notifications,
        push_notifications: profileForm.push_notifications,
        marketing_notifications: profileForm.marketing_notifications,
        compact_mode: profileForm.compact_mode,
        default_dashboard_view: normalizedDashboardView,
        mask_balances: profileForm.mask_balances,
        require_payment_confirmation: profileForm.require_payment_confirmation,
      });

      setUser(response.data.user);
      setProfileNotice(response.data.message ?? 'Profils atjaunināts.');
    } catch (error) {
      setProfileError(extractApiError(error, 'Neizdevās atjaunināt profilu.'));
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleProfilePictureUpload(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      setProfileError('Izvēlētais fails nav attēls.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('Attēla izmērs nedrīkst pārsniegt 2MB.');
      return;
    }

    setProfilePictureUploading(true);
    setProfileError(null);
    setProfileNotice(null);

    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
      const response = await api.post<{ message?: string; user: AuthUser }>('/auth/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(response.data.user);
      setProfileNotice(response.data.message ?? 'Profila attēls atjaunināts.');
    } catch (error) {
      setProfileError(extractApiError(error, 'Neizdevās augšupielādēt profila attēlu.'));
    } finally {
      setProfilePictureUploading(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const currentPassword = passwordForm.current_password;
    const newPassword = passwordForm.new_password;
    const newPasswordConfirmation = passwordForm.new_password_confirmation;

    if (!currentPassword || !newPassword || !newPasswordConfirmation) {
      setPasswordError('Visi paroles maiņas lauki ir obligāti.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Jaunajai parolei jābūt vismaz 8 simbolus garai, ar vienu lielo burtu, vienu mazo burtu un vienu ciparu.');
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setPasswordError('Jaunajai parolei jābūt vismaz 8 simbolus garai, ar vienu lielo burtu, vienu mazo burtu un vienu ciparu.');
      return;
    }

    if (newPassword !== newPasswordConfirmation) {
      setPasswordError('Jaunā parole un apstiprinājums nesakrīt.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('Jaunā parole nedrīkst sakrist ar esošo paroli.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordNotice(null);

    try {
      const response = await api.post<{ message?: string }>('/auth/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });

      setPasswordNotice(response.data.message ?? 'Parole veiksmīgi nomainīta.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
    } catch (error) {
      setPasswordError(extractApiError(error, 'Neizdevās nomainīt paroli.'));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleLogout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout network errors to avoid locking user in local session.
    } finally {
      clearApiToken();
      setUser(null);
      setStatsData(null);
      setProfileForm({
        name: '',
        email: '',
        preferred_currency: 'EUR',
        locale: 'lv',
        timezone: 'Europe/Riga',
        date_format: 'dd.mm.yyyy',
        amount_format: 'local',
        address: '',
        phone: '',
        region: '',
        country: 'LV',
        postal_code: '',
        phone_country: '+371',
        theme_mode: 'light',
        email_notifications: true,
        push_notifications: true,
        marketing_notifications: false,
        compact_mode: false,
        default_dashboard_view: 'overview',
        mask_balances: false,
        require_payment_confirmation: true,
      });
      setProfileSaving(false);
      setProfileNotice(null);
      setProfileError(null);
      setPasswordForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
      setPasswordSaving(false);
      setPasswordNotice(null);
      setPasswordError(null);
      setAccountsPage(null);
      setTransactionsPageData(null);
      setApprovalQueueData(null);
      setApprovalQueueError(null);
      setApprovalQueueLoading(false);
      setTransactionsNotice(null);
      setTransactionActionLoadingId(null);
      setTransferForm({
        from_account_id: '',
        to_account_id: '',
        recipient_query: '',
        amount: '',
        fee: '0.00',
        category: 'transfer',
        description: '',
      });
      setMemberPanelAccountId(null);
      setAccountMembers([]);
      setMembersError(null);
      setMembersNotice(null);
      setCreateMemberLoading(false);
      setMemberActionLoadingId(null);
      setNewMemberForm({
        user_id: '',
        member_role: 'viewer',
        daily_limit: '',
      });
      setMemberCandidateQuery('');
      setMemberCandidates([]);
      setMemberCandidatesLoading(false);
      setMemberEdits({});
      setAdminUsersLoading(false);
      setAdminUsersError(null);
      setAdminUsersNotice(null);
      setAdminUsersPageData(null);
      setAdminUsersPage(1);
      setAdminFiltersDraft(defaultAdminFilters);
      setAdminFilters(defaultAdminFilters);
      setAdminRoles([]);
      setAdminRoleLoadError(null);
      setAdminUserActionLoadingId(null);
      setAdminUserEdits({});
      setAdminMetricsLoading(false);
      setAdminMetricsError(null);
      setAdminMetrics(null);
      setActiveView('overview');
      navigateGuest('home');
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setCreateAccountLoading(true);
    setAccountsError(null);

    try {
      await api.post('/accounts', {
        name: newAccount.name,
        currency: newAccount.currency.toUpperCase(),
        type: newAccount.type,
      });

      setNewAccount({ name: '', currency: 'EUR', type: 'personal' });
      await Promise.all([fetchAccounts(), fetchTransferRecipients(), fetchStats(), fetchAdminMetrics()]);
    } catch (error) {
      setAccountsError(extractApiError(error, 'Neizdevās izveidot kontu.'));
    } finally {
      setCreateAccountLoading(false);
    }
  }

  async function renameAccount(account: Account): Promise<void> {
    const nextName = await requestTextInput({
      title: 'Pārsaukt kontu',
      message: `Ievadi jaunu nosaukumu kontam "${account.name}".`,
      initialValue: account.name,
      placeholder: 'Piemēram, Ikdienas konts',
      confirmLabel: 'Saglabāt',
      maxLength: 120,
    });

    if (nextName === null || nextName.trim().length === 0 || nextName.trim() === account.name) {
      return;
    }

    const normalizedName = sanitizeAccountName(nextName).trim();
    if (normalizedName.length > 120) {
      setAccountsError('Konta nosaukums nedrīkst pārsniegt 120 simbolus.');
      return;
    }

    try {
      await api.put(`/accounts/${account.id}`, { name: normalizedName });
      await Promise.all([fetchAccounts(), fetchTransferRecipients(), fetchAdminMetrics()]);
    } catch (error) {
      setAccountsError(extractApiError(error, 'Neizdevās pārsaukt kontu.'));
    }
  }

  async function updateAccountStatus(account: Account, status: Account['status']): Promise<void> {
    try {
      await api.put(`/accounts/${account.id}`, { status });
      await Promise.all([fetchAccounts(), fetchTransferRecipients(), fetchStats(), fetchAdminMetrics()]);
    } catch (error) {
      setAccountsError(extractApiError(error, 'Neizdevās mainīt konta statusu.'));
    }
  }

  async function closeAccount(account: Account): Promise<void> {
    const shouldClose = await requestConfirmation({
      title: 'Aizvērt kontu',
      message: `Vai tiešām aizvērt kontu "${account.name}"?`,
      confirmLabel: 'Aizvērt kontu',
      tone: 'danger',
    });

    if (!shouldClose) {
      return;
    }

    try {
      await api.delete(`/accounts/${account.id}`);
      await Promise.all([fetchAccounts(), fetchTransferRecipients(), fetchStats(), fetchAdminMetrics()]);
    } catch (error) {
      setAccountsError(extractApiError(error, 'Neizdevās aizvērt kontu.'));
    }
  }

  async function searchMemberCandidates(): Promise<void> {
    if (!selectedMemberAccount) {
      setMembersError('Vispirms izvēlies kontu.');
      return;
    }

    const query = memberCandidateQuery.trim();
    if (query.length < 2) {
      setMembersError('Ievadi vismaz 2 simbolus lietotāja meklēšanai.');
      setMemberCandidates([]);
      setMemberCandidateSearchAttempted(false);
      return;
    }

    setMemberCandidatesLoading(true);
    setMembersError(null);
    setMembersNotice(null);
    setMemberCandidateSearchAttempted(true);

    try {
      const response = await api.get<{ candidates: MemberCandidate[] }>(
        `/accounts/${selectedMemberAccount.id}/members/candidates`,
        {
          params: {
            q: query,
            limit: 12,
          },
        }
      );

      setMemberCandidates(response.data.candidates);
    } catch (error) {
      setMembersError(extractApiError(error, 'Neizdevās atrast lietotājus dalībnieka pievienošanai.'));
      setMemberCandidates([]);
    } finally {
      setMemberCandidatesLoading(false);
    }
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedMemberAccount) {
      setMembersError('Vispirms izvēlies kontu, kuram pievienot dalībnieku.');
      return;
    }

    const parsedUserId = Number(newMemberForm.user_id);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      setMembersError('Izvēlies lietotāju no meklēšanas saraksta.');
      return;
    }

    setCreateMemberLoading(true);
    setMembersError(null);
    setMembersNotice(null);

    try {
      const payload = {
        user_id: parsedUserId,
        member_role: newMemberForm.member_role,
        daily_limit:
          newMemberForm.daily_limit.trim() === '' ? null : Number(newMemberForm.daily_limit),
      };

      const response = await api.post<{ message?: string }>(
        `/accounts/${selectedMemberAccount.id}/members`,
        payload
      );

      setMembersNotice(response.data.message ?? 'Dalībnieks veiksmīgi pievienots.');
      setNewMemberForm({
        user_id: '',
        member_role: 'viewer',
        daily_limit: '',
      });
      setMemberCandidateQuery('');
      setMemberCandidates([]);
      await Promise.all([fetchAccountMembers(), fetchAdminMetrics()]);
    } catch (error) {
      setMembersError(extractApiError(error, 'Neizdevās pievienot konta dalībnieku.'));
    } finally {
      setCreateMemberLoading(false);
    }
  }

  async function handleUpdateMember(member: AccountMember): Promise<void> {
    if (!selectedMemberAccount || member.member_role === 'owner') {
      return;
    }

    const edit = memberEdits[member.id] ?? {
      member_role: member.member_role,
      daily_limit: member.daily_limit ?? '',
    };

    setMemberActionLoadingId(member.id);
    setMembersError(null);
    setMembersNotice(null);

    try {
      const payload = {
        member_role: edit.member_role,
        daily_limit: edit.daily_limit.trim() === '' ? null : Number(edit.daily_limit),
      };

      const response = await api.patch<{ message?: string }>(
        `/accounts/${selectedMemberAccount.id}/members/${member.id}`,
        payload
      );

      setMembersNotice(response.data.message ?? 'Dalībnieks atjaunināts.');
      await Promise.all([fetchAccountMembers(), fetchAdminMetrics()]);
    } catch (error) {
      setMembersError(extractApiError(error, 'Neizdevās atjaunināt dalībnieku.'));
    } finally {
      setMemberActionLoadingId((current) => (current === member.id ? null : current));
    }
  }

  async function handleRemoveMember(member: AccountMember): Promise<void> {
    if (!selectedMemberAccount || member.member_role === 'owner') {
      return;
    }

    const shouldRemove = await requestConfirmation({
      title: 'Noņemt dalībnieku',
      message: `Vai tiešām noņemt dalībnieku ${member.user?.name ?? member.user_id}?`,
      confirmLabel: 'Noņemt',
      tone: 'danger',
    });

    if (!shouldRemove) {
      return;
    }

    setMemberActionLoadingId(member.id);
    setMembersError(null);
    setMembersNotice(null);

    try {
      const response = await api.delete<{ message?: string }>(
        `/accounts/${selectedMemberAccount.id}/members/${member.id}`
      );

      setMembersNotice(response.data.message ?? 'Dalībnieks noņemts.');
      await Promise.all([fetchAccountMembers(), fetchAdminMetrics()]);
    } catch (error) {
      setMembersError(extractApiError(error, 'Neizdevās noņemt dalībnieku.'));
    } finally {
      setMemberActionLoadingId((current) => (current === member.id ? null : current));
    }
  }

  async function handleUpdateManagedUser(
    managedUser: AdminUser,
    overrides?: { status?: AdminUser['status']; role_id?: string }
  ): Promise<void> {
    const edit = adminUserEdits[managedUser.id] ?? {
      role_id: managedUser.role?.id ? String(managedUser.role.id) : '',
      status: managedUser.status,
    };

    const effectiveRoleId = overrides?.role_id ?? edit.role_id;
    const effectiveStatus = overrides?.status ?? edit.status;

    if (!effectiveRoleId) {
      setAdminUsersError('Lietotājam jānorāda derīga loma.');
      return;
    }

    const targetRole = adminRoles.find((role) => role.id === Number(effectiveRoleId));
    if (!targetRole) {
      setAdminUsersError('Izvēlētā loma nav derīga.');
      return;
    }

    const demotesAdmin = managedUser.role?.code === 'admin' && targetRole.code !== 'admin';
    const deactivatesUser = managedUser.status === 'active' && effectiveStatus !== 'active';

    if (demotesAdmin || deactivatesUser) {
      const shouldProceed = await requestConfirmation({
        title: 'Augsta riska izmaiņa',
        message: 'Šī darbība var ietekmēt piekļuvi administrēšanai. Vai tiešām turpināt?',
        confirmLabel: 'Turpināt',
        tone: 'warning',
      });

      if (!shouldProceed) {
        return;
      }
    }

    setAdminUserActionLoadingId(managedUser.id);
    setAdminUsersError(null);
    setAdminUsersNotice(null);

    try {
      const response = await api.patch<{ message?: string; user: AdminUser }>(
        `/admin/users/${managedUser.id}`,
        {
          role_id: targetRole.id,
          status: effectiveStatus,
        }
      );

      setAdminUsersNotice(response.data.message ?? 'Lietotājs atjaunināts.');

      if (user && response.data.user.id === user.id) {
        setUser({
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          preferred_currency: response.data.user.preferred_currency ?? user.preferred_currency ?? 'EUR',
          locale: response.data.user.locale ?? user.locale ?? 'lv',
          timezone: response.data.user.timezone ?? user.timezone ?? 'Europe/Riga',
          date_format: response.data.user.date_format ?? user.date_format ?? 'dd.mm.yyyy',
          amount_format: response.data.user.amount_format ?? user.amount_format ?? 'local',
          address: response.data.user.address ?? user.address ?? null,
          phone: response.data.user.phone ?? user.phone ?? null,
          region: response.data.user.region ?? user.region ?? null,
          country: response.data.user.country ?? user.country ?? null,
          postal_code: response.data.user.postal_code ?? user.postal_code ?? null,
          phone_country: response.data.user.phone_country ?? user.phone_country ?? '+371',
          theme_mode: response.data.user.theme_mode ?? user.theme_mode ?? 'light',
          email_notifications: response.data.user.email_notifications ?? user.email_notifications ?? true,
          push_notifications: response.data.user.push_notifications ?? user.push_notifications ?? true,
          marketing_notifications:
            response.data.user.marketing_notifications ?? user.marketing_notifications ?? false,
          compact_mode: response.data.user.compact_mode ?? user.compact_mode ?? false,
          default_dashboard_view:
            response.data.user.default_dashboard_view ?? user.default_dashboard_view ?? 'overview',
          mask_balances: response.data.user.mask_balances ?? user.mask_balances ?? false,
          require_payment_confirmation:
            response.data.user.require_payment_confirmation ?? user.require_payment_confirmation ?? true,
          profile_picture: response.data.user.profile_picture ?? user.profile_picture ?? null,
          two_factor_enabled: response.data.user.two_factor_enabled ?? user.two_factor_enabled ?? false,
          two_factor_confirmed_at:
            response.data.user.two_factor_confirmed_at ?? user.two_factor_confirmed_at ?? null,
          email_verified_at: response.data.user.email_verified_at ?? user.email_verified_at ?? null,
          status: response.data.user.status,
          role: response.data.user.role,
        });
      }

      await Promise.all([fetchAdminUsers(), fetchAdminMetrics()]);
    } catch (error) {
      setAdminUsersError(extractApiError(error, 'Neizdevās atjaunināt lietotāju.'));
    } finally {
      setAdminUserActionLoadingId((current) => (current === managedUser.id ? null : current));
    }
  }

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setTransactionsNotice(null);
    setTransactionsError(null);

    const fromAccountId = Number(transferForm.from_account_id);
    const toAccountId = Number(transferForm.to_account_id);
    const amountValue = Number(transferForm.amount);

    if (!Number.isInteger(fromAccountId) || !Number.isInteger(toAccountId)) {
      setTransactionsError('Izvēlies avota kontu un ievadi vai izvēlies derīgu saņēmēja kontu.');
      return;
    }

    if (fromAccountId === toAccountId) {
      setTransactionsError('Avota un mērķa konts nedrīkst būt vienāds.');
      return;
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setTransactionsError('Ievadi derīgu pārskaitījuma summu.');
      return;
    }

    if (amountValue > MAX_TRANSFER_AMOUNT) {
      setTransactionsError('Maksājuma summa nedrīkst pārsniegt 999 999 999 999,99.');
      return;
    }

    const calculatedFee = Number((amountValue * (TRANSFER_FEE_PERCENT / 100)).toFixed(2));
    const totalDebit = amountValue + calculatedFee;
    const sourceAccount = accountMap.get(fromAccountId);
    const destinationAccount = accountMap.get(toAccountId);
    const destinationRecipient = transferRecipientMap.get(toAccountId);

    if (sourceAccount && totalDebit > Number(sourceAccount.balance)) {
      setTransactionsError('Nepietiekams atlikums izvēlētajā avota kontā.');
      return;
    }

    if (!destinationAccount && !destinationRecipient) {
      setTransactionsError('Izvēlies derīgu mērķa kontu no bankas saņēmēju saraksta.');
      return;
    }

    const confirmed = await requestConfirmation({
      title: 'Apstiprināt maksājumu',
      message: `Apstiprināt maksājumu ${formatMoneyForUser(amountValue, sourceAccount?.currency ?? 'EUR')} apmērā?`,
      confirmLabel: 'Apstiprināt',
      tone: 'warning',
    });

    if (!confirmed) {
      return;
    }

    setTransferLoading(true);
    setTransactionsError(null);
    setTransactionsNotice(null);

    try {
      const response = await api.post<{ message?: string; transaction?: Transaction }>('/transactions', {
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: amountValue,
        fee: calculatedFee,
        category: transferForm.category,
        description: transferForm.description || null,
      });

      const backendMessage = response.data.message?.toLowerCase() ?? '';
      if (backendMessage.includes('pending')) {
        setTransactionsNotice('Maksājums izveidots un gaida apstiprinājumu.');
        setTransactionsInitialSection('approvals');
      } else if (backendMessage.includes('completed')) {
        setTransactionsNotice('Maksājums veiksmīgi izpildīts.');
      } else if (response.data.message) {
        setTransactionsNotice(response.data.message);
      }

      setTransferForm({
        from_account_id: '',
        to_account_id: '',
        recipient_query: '',
        amount: '',
        fee: '0.00',
        category: 'transfer',
        description: '',
      });

      await refreshAllData();
    } catch (error) {
      setTransactionsError(extractApiError(error, 'Neizdevās izveidot transakciju.'));
      setTransactionsNotice(null);
    } finally {
      setTransferLoading(false);
    }
  }

  async function approveTransaction(tx: Transaction): Promise<void> {
    setTransactionActionLoadingId(tx.id);
    setTransactionsError(null);
    setTransactionsNotice(null);

    try {
      const response = await api.post<{ message?: string }>(`/transactions/${tx.id}/approve`);
      const backendMessage = response.data.message?.toLowerCase() ?? '';

      if (backendMessage.includes('executed')) {
        setTransactionsNotice('Maksājums apstiprināts un izpildīts.');
      } else if (backendMessage.includes('approval recorded')) {
        setTransactionsNotice('Apstiprinājums ir reģistrēts.');
      } else if (response.data.message) {
        setTransactionsNotice(response.data.message);
      }

      await refreshAllData();
    } catch (error) {
      setTransactionsError(extractApiError(error, 'Neizdevās apstiprināt transakciju.'));
    } finally {
      setTransactionActionLoadingId((current) => (current === tx.id ? null : current));
    }
  }

  async function rejectTransaction(tx: Transaction): Promise<void> {
    setTransactionActionLoadingId(tx.id);
    setTransactionsError(null);
    setTransactionsNotice(null);

    try {
      const response = await api.post<{ message?: string }>(`/transactions/${tx.id}/reject`);
      if (response.data.message) {
        setTransactionsNotice(response.data.message);
      } else {
        setTransactionsNotice('Transakcija noraidīta.');
      }

      await refreshAllData();
    } catch (error) {
      setTransactionsError(extractApiError(error, 'Neizdevās noraidīt transakciju.'));
    } finally {
      setTransactionActionLoadingId((current) => (current === tx.id ? null : current));
    }
  }

  async function editTransaction(
    tx: Transaction,
    payload: { description: string; category: Transaction['category'] }
  ): Promise<void> {
    try {
      await api.put(`/transactions/${tx.id}`, {
        description: payload.description || null,
        category: payload.category,
      });

      setTransactionsNotice('Transakcija atjaunināta.');
      setTransactionsError(null);
      await refreshAllData();
    } catch (error) {
      const message = extractApiError(error, 'Neizdevās atjaunot transakciju.');
      setTransactionsError(message);
      throw new Error(message);
    }
  }

  async function deleteTransaction(tx: Transaction): Promise<void> {
    const shouldDelete = await requestConfirmation({
      title: 'Dzēst transakciju',
      message: `Vai tiešām dzēst transakciju ${tx.reference}?`,
      confirmLabel: 'Dzēst',
      tone: 'danger',
    });

    if (!shouldDelete) {
      return;
    }

    try {
      await api.delete(`/transactions/${tx.id}`);
      await refreshAllData();
    } catch (error) {
      setTransactionsError(extractApiError(error, 'Neizdevās dzēst transakciju.'));
    }
  }

  const navigateToLogin = () => {
    setAuthMode('login');
    setAuthError(null);
    navigateGuest('auth');
  };

  const navigateToRegister = () => {
    setAuthMode('register');
    setAuthError(null);
    navigateGuest('auth');
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-bank-base text-bank-ink font-body flex items-center justify-center">
        <div className="rounded-2xl border border-bank-border bg-bank-panel px-8 py-6 shadow-cosmic-soft">
          <p className="flex items-center gap-3 text-sm">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            Notiek sesijas ielāde...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (twoFactorSetupSession) {
      return (
        <div className="min-h-screen bg-bank-base font-body text-bank-ink">
          <div className="mx-auto max-w-[560px] px-4 py-10 sm:px-6 sm:py-12">
            <button
              onClick={handleCancelTwoFactorFlow}
              className="mb-5 rounded-md border border-bank-border bg-bank-panel px-4 py-2 text-sm font-semibold transition-colors hover:bg-bank-panel-soft"
            >
              Atcelt un atgriezties sākumā
            </button>

            <section className="rounded-xl border border-bank-border bg-white p-4 shadow-[0_8px_24px_rgba(17,34,64,0.08)] sm:p-5">
              <h1 className="font-display text-2xl font-semibold tracking-tight">Aktivizē autentifikatora verifikāciju</h1>
              <p className="mt-2 break-words text-sm text-bank-muted [overflow-wrap:anywhere]">
                Konts <span className="font-semibold text-bank-ink">{twoFactorSetupSession.email}</span> jāapstiprina ar TOTP lietotni.
              </p>
              <p className="mt-1 text-sm text-bank-muted">
                Microsoft Authenticator strādā: Add account - Other account (TOTP), pēc tam ievadi slepeno atslēgu manuāli.
              </p>

              <div className="mt-4 grid gap-3 rounded-lg border border-bank-border bg-bank-panel-soft/60 p-3 text-sm sm:grid-cols-[auto,1fr] sm:items-start">
                <div className="mx-auto rounded-lg border border-bank-border bg-white p-2 shadow-sm sm:mx-0">
                  <QRCodeSVG
                    value={twoFactorSetupSession.setup.otpauth_url}
                    size={132}
                    level="M"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#112240"
                    title="2FA setup QR code"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-bank-ink">Slepenā atslēga</p>
                  <p className="mt-1 max-w-full break-all font-mono text-xs [overflow-wrap:anywhere]">{twoFactorSetupSession.setup.secret}</p>
                  <details className="mt-2 rounded-md border border-bank-border/70 bg-white/70 p-2">
                    <summary className="cursor-pointer text-xs font-medium text-bank-muted">Rādīt tehnisko otpauth saiti</summary>
                    <p className="mt-2 max-w-full break-all font-mono text-[11px] leading-relaxed text-bank-muted [overflow-wrap:anywhere]">
                      {twoFactorSetupSession.setup.otpauth_url}
                    </p>
                  </details>
                </div>
              </div>

              <form onSubmit={handleTwoFactorSetupConfirm} className="mt-4 space-y-3">
                <label htmlFor="2fa-setup-code" className="block text-sm font-medium">
                  Ievadi 6-ciparu kodu no Authenticator lietotnes
                  <input
                    id="2fa-setup-code"
                    aria-label="Ievadi 6 ciparu kodu"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="mt-1 w-full rounded-md border border-bank-border bg-bank-panel px-3 py-2 text-bank-ink placeholder:text-bank-muted/90"
                    placeholder="123456"
                  />
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleSkipTwoFactorSetup}
                    disabled={authLoading}
                    className="rounded-md border border-bank-border bg-bank-panel px-4 py-2.5 text-sm font-semibold text-bank-ink transition-colors hover:bg-bank-panel-soft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Izlast
                  </button>
                  <button
                    type="submit"
                    disabled={authLoading || twoFactorCode.length !== 6}
                    className="rounded-md border border-bank-cosmic bg-bank-cosmic px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-bank-cosmic-soft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {authLoading ? 'Notiek apstiprināšana...' : 'Apstiprināt'}
                  </button>
                </div>
              </form>

              {authError ? <p className="mt-3 text-sm text-rose-700">{authError}</p> : null}
            </section>
          </div>
        </div>
      );
    }

    if (twoFactorChallengeSession) {
      return (
        <div className="min-h-screen bg-bank-base font-body text-bank-ink">
          <div className="mx-auto max-w-[520px] px-4 py-10 sm:px-6 sm:py-12">
            <button
              onClick={handleCancelTwoFactorFlow}
              className="mb-5 rounded-md border border-bank-border bg-bank-panel px-4 py-2 text-sm font-semibold transition-colors hover:bg-bank-panel-soft"
            >
              Atcelt un atgriezties sākumā
            </button>

            <section className="rounded-xl border border-bank-border bg-white p-4 shadow-[0_8px_24px_rgba(17,34,64,0.08)] sm:p-5">
              <h1 className="font-display text-2xl font-semibold tracking-tight">Ievadi 2FA kodu</h1>
              <p className="mt-2 break-words text-sm text-bank-muted [overflow-wrap:anywhere]">
                Konts <span className="font-semibold text-bank-ink">{twoFactorChallengeSession.email}</span> pieprasa kodu no Authenticator lietotnes.
              </p>

              <form onSubmit={handleTwoFactorLoginConfirm} className="mt-4 space-y-3">
                <label htmlFor="2fa-challenge-code" className="block text-sm font-medium">
                  6-ciparu kods
                  <input
                    id="2fa-challenge-code"
                    aria-label="6 ciparu kods"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="mt-1 w-full rounded-md border border-bank-border bg-bank-panel px-3 py-2 text-bank-ink placeholder:text-bank-muted/90"
                    placeholder="123456"
                  />
                </label>

                <button
                  type="submit"
                  disabled={authLoading || twoFactorCode.length !== 6}
                  className="w-full rounded-md border border-bank-cosmic bg-bank-cosmic px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-bank-cosmic-soft disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {authLoading ? 'Notiek pārbaude...' : 'Apstiprināt un ielogoties'}
                </button>
              </form>

              {authError ? <p className="mt-3 text-sm text-rose-700">{authError}</p> : null}
            </section>
          </div>
        </div>
      );
    }

    if (guestScreen === 'home') {
      return (
        <BankLanding
          onLogin={navigateToLogin}
          onRegister={navigateToRegister}
          onAbout={() => navigateGuest('about')}
          onContact={() => navigateGuest('contact')}
          onFaq={() => navigateGuest('faq')}
          onTerms={() => navigateGuest('terms')}
          onPrivacy={() => navigateGuest('privacy')}
          onCookie={() => navigateGuest('cookie')}
        />
      );
    }

    if (guestScreen === 'about') {
      return (
        <AboutPage
          onBackHome={() => navigateGuest('home')}
          onContact={() => navigateGuest('contact')}
          onFaq={() => navigateGuest('faq')}
          onTerms={() => navigateGuest('terms')}
          onPrivacy={() => navigateGuest('privacy')}
          onCookie={() => navigateGuest('cookie')}
          onLogin={navigateToLogin}
          onRegister={navigateToRegister}
        />
      );
    }

    if (guestScreen === 'contact') {
      return (
        <ContactPage
          onBackHome={() => navigateGuest('home')}
          onAbout={() => navigateGuest('about')}
          onFaq={() => navigateGuest('faq')}
          onTerms={() => navigateGuest('terms')}
          onPrivacy={() => navigateGuest('privacy')}
          onCookie={() => navigateGuest('cookie')}
          onLogin={navigateToLogin}
          onRegister={navigateToRegister}
        />
      );
    }

    if (guestScreen === 'faq') {
      return (
        <FaqPage
          onBackHome={() => navigateGuest('home')}
          onAbout={() => navigateGuest('about')}
          onContact={() => navigateGuest('contact')}
          onTerms={() => navigateGuest('terms')}
          onPrivacy={() => navigateGuest('privacy')}
          onCookie={() => navigateGuest('cookie')}
          onLogin={navigateToLogin}
          onRegister={navigateToRegister}
        />
      );
    }

    if (guestScreen === 'terms') {
      return (
        <LegalPage
          onBackHome={() => navigateGuest('home')}
          onAbout={() => navigateGuest('about')}
          onContact={() => navigateGuest('contact')}
          onFaq={() => navigateGuest('faq')}
          onPrivacy={() => navigateGuest('privacy')}
          onCookie={() => navigateGuest('cookie')}
          onLogin={navigateToLogin}
          onRegister={navigateToRegister}
        />
      );
    }

    if (guestScreen === 'privacy') {
      return (
        <PrivacyPage
          onBackHome={() => navigateGuest('home')}
          onAbout={() => navigateGuest('about')}
          onContact={() => navigateGuest('contact')}
          onFaq={() => navigateGuest('faq')}
          onTerms={() => navigateGuest('terms')}
          onCookie={() => navigateGuest('cookie')}
          onLogin={navigateToLogin}
          onRegister={navigateToRegister}
        />
      );
    }

    if (guestScreen === 'cookie') {
      return (
        <CookiePage
          onBackHome={() => navigateGuest('home')}
          onAbout={() => navigateGuest('about')}
          onContact={() => navigateGuest('contact')}
          onFaq={() => navigateGuest('faq')}
          onTerms={() => navigateGuest('terms')}
          onPrivacy={() => navigateGuest('privacy')}
          onLogin={navigateToLogin}
          onRegister={navigateToRegister}
        />
      );
    }

    return (
      <AuthPanel
        authMode={authMode}
        authLoading={authLoading}
        authError={authError}
        loginData={loginData}
        registerData={registerData}
        onAuthModeChange={(mode) => {
          setAuthMode(mode);
          setTwoFactorChallengeSession(null);
          setTwoFactorSetupSession(null);
          setTwoFactorCode('');
        }}
        onBackToLanding={() => {
          navigateGuest('home');
          setAuthError(null);
          setTwoFactorChallengeSession(null);
          setTwoFactorSetupSession(null);
          setTwoFactorCode('');
        }}
        onClearError={() => setAuthError(null)}
        onLoginDataChange={setLoginData}
        onRegisterDataChange={setRegisterData}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-bank-base text-bank-ink font-body ${user.compact_mode ? 'bank-compact' : ''}`}>
      <DashboardTopBar
        userName={user.name}
        profilePicture={resolvePublicAssetUrl(user.profile_picture)}
        currentDate={headerDate}
        profileLockNotice={
          accountNeedsRevision
            ? 'Konts ir nosūtīts labošanai. Atver iestatījumus, salabo profila datus un saglabā, lai atjaunotu piekļuvi.'
            : userBlocked
              ? 'Konts ir bloķēts. Sazinies ar administratoru. Pieejami tikai iestatījumi.'
            : profileSetupLocked
              ? 'Aizpildi profila iestatījumus (adrese, tālrunis, reģions, valsts, pasta indekss), lai atbloķētu pārējās sadaļas.'
              : accountPendingApproval
                ? 'Tavs konts gaida administratora apstiprināšanu. Pārējās sadaļas būs pieejamas pēc apstiprinājuma.'
                : null
        }
          profileLockTone={accountNeedsRevision || userBlocked ? 'danger' : 'warning'}
        onLogout={handleLogout}
      />

      <div
        className={`mx-auto grid max-w-[1240px] ${user.compact_mode ? 'gap-4 px-4 py-5' : 'gap-6 px-5 py-6'} lg:grid-cols-[224px_1fr]`}
      >
        <DashboardSidebar
          activeView={activeView}
          isAdmin={isAdmin}
          onViewChange={handleDashboardViewChange}
          profileSetupLocked={profileSetupLocked}
          accountPendingApproval={accountPendingApproval}
          accountBlocked={userBlocked}
          statusSummary={sidebarStatusSummary}
        />

        <main className="min-w-0 space-y-5">
          {activeView === 'overview' && (
            <DashboardOverview
              statsLoading={statsLoading}
              statsData={statsData}
              isAdmin={isAdmin}
              adminMetrics={adminMetrics}
              monthlyActivityRows={monthlyActivityRows}
              formatMoney={formatMoneyForUser}
              compactNumber={compactNumberForUser}
              localeTag={localeTag}
              timezone={user.timezone ?? 'Europe/Riga'}
            />
          )}

          {activeView === 'settings' && (
            <DashboardProfileView
              profileForm={profileForm}
              profilePicture={resolvePublicAssetUrl(user.profile_picture)}
              setProfileForm={setProfileForm}
              profileSaving={profileSaving}
              onSubmit={handleProfileSubmit}
              onProfilePictureUpload={handleProfilePictureUpload}
              profilePictureUploading={profilePictureUploading}
              passwordForm={passwordForm}
              setPasswordForm={setPasswordForm}
              passwordSaving={passwordSaving}
              onPasswordSubmit={handlePasswordSubmit}
            />
          )}

          {activeView === 'accounts' && (
            <DashboardAccountsView
              accountFiltersDraft={accountFiltersDraft}
              setAccountFiltersDraft={setAccountFiltersDraft}
              setAccountFilters={setAccountFilters}
              setAccountPage={setAccountPage}
              defaultAccountFilters={defaultAccountFilters}
              accountsLoading={accountsLoading}
              accounts={accounts}
              accountsPage={accountsPage}
              formatMoney={formatMoneyForUser}
              accountTypeLabel={accountTypeLabel}
              accountStatusLabel={accountStatusLabel}
              renameAccount={renameAccount}
              updateAccountStatus={updateAccountStatus}
              closeAccount={closeAccount}
              memberPanelAccountId={memberPanelAccountId}
              setMemberPanelAccountId={setMemberPanelAccountId}
              setMembersNotice={setMembersNotice}
              setMembersError={setMembersError}
              setMemberCandidateQuery={setMemberCandidateQuery}
              setMemberCandidates={setMemberCandidates}
              newMemberForm={newMemberForm}
              setNewMemberForm={setNewMemberForm}
              memberCandidateQuery={memberCandidateQuery}
              memberCandidates={memberCandidates}
              memberCandidatesLoading={memberCandidatesLoading}
              memberCandidateSearchAttempted={memberCandidateSearchAttempted}
              setMemberCandidateSearchAttempted={setMemberCandidateSearchAttempted}
              newAccount={newAccount}
              setNewAccount={setNewAccount}
              handleCreateAccount={handleCreateAccount}
              createAccountLoading={createAccountLoading}
              selectedMemberAccount={selectedMemberAccount}
              membersLoading={membersLoading}
              accountMembers={accountMembers}
              memberEdits={memberEdits}
              setMemberEdits={setMemberEdits}
              memberActionLoadingId={memberActionLoadingId}
              canEditSelectedMembers={canEditSelectedMembers}
              memberRoleLabel={memberRoleLabel}
              handleUpdateMember={handleUpdateMember}
              handleRemoveMember={handleRemoveMember}
              handleAddMember={handleAddMember}
              searchMemberCandidates={searchMemberCandidates}
              createMemberLoading={createMemberLoading}
            />
          )}

          {activeView === 'admin' && isAdmin && (
            <DashboardAdminView
              adminUsersLoading={adminUsersLoading}
              adminMetricsLoading={adminMetricsLoading}
              adminMetrics={adminMetrics}
              adminFiltersDraft={adminFiltersDraft}
              setAdminFiltersDraft={setAdminFiltersDraft}
              setAdminFilters={setAdminFilters}
              setAdminUsersPage={setAdminUsersPage}
              defaultAdminFilters={defaultAdminFilters}
              adminRoles={adminRoles}
              adminUsers={adminUsers}
              adminUserEdits={adminUserEdits}
              setAdminUserEdits={setAdminUserEdits}
              adminUserActionLoadingId={adminUserActionLoadingId}
              currentUserId={user?.id}
              handleUpdateManagedUser={handleUpdateManagedUser}
              formatDate={formatDateForUser}
              adminUsersPageData={adminUsersPageData}
            />
          )}

          {activeView === 'transactions' && (
            <DashboardTransactionsView
              transactionFiltersDraft={transactionFiltersDraft}
              setTransactionFiltersDraft={setTransactionFiltersDraft}
              setTransactionFilters={setTransactionFilters}
              setTransactionPage={setTransactionPage}
              defaultTransactionFilters={defaultTransactionFilters}
              accountOptions={accountOptions}
              recipientOptions={transferRecipientOptions}
              recipientOptionsLoading={transferRecipientOptionsLoading}
              approvalQueueLoading={approvalQueueLoading}
              approvableTransactions={approvableTransactions}
              transactionActionLoadingId={transactionActionLoadingId}
              accountMap={accountMap}
              formatMoney={formatMoneyForUser}
              formatDate={formatDateForUser}
              approveTransaction={approveTransaction}
              rejectTransaction={rejectTransaction}
              transferForm={transferForm}
              setTransferForm={setTransferForm}
              handleCreateTransaction={handleCreateTransaction}
              transferLoading={transferLoading}
              transactionsLoading={transactionsLoading}
              transactions={transactions}
              transactionCategoryLabel={transactionCategoryLabel}
              transactionStatusLabel={transactionStatusLabel}
              transactionStatusClasses={transactionStatusClasses}
              currentUserId={user.id}
              isAdmin={isAdmin}
              editTransaction={editTransaction}
              deleteTransaction={deleteTransaction}
              transactionsPageData={transactionsPageData}
              initialSection={transactionsInitialSection}
            />
          )}
        </main>
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bank-ink/35 px-4 py-6 backdrop-blur-[1px]">
          <article className="w-full max-w-md rounded-xl border border-bank-border bg-white p-5 shadow-[0_14px_36px_rgba(19,34,66,0.22)]">
            <h3 className="text-base font-semibold text-bank-ink">{confirmDialog.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-bank-muted">{confirmDialog.message}</p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => closeConfirmDialog(false)}
                className="rounded-lg border border-bank-border px-3 py-2 text-sm font-semibold text-bank-ink transition hover:bg-bank-panel-soft"
              >
                Atcelt
              </button>
              <button
                onClick={() => closeConfirmDialog(true)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
                  confirmDialog.tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmDialog.tone === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-bank-cosmic hover:bg-bank-cosmic-soft'
                }`}
              >
                {confirmDialog.confirmLabel ?? 'Apstiprināt'}
              </button>
            </div>
          </article>
        </div>
      )}

      {promptDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bank-ink/35 px-4 py-6 backdrop-blur-[1px]">
          <article className="w-full max-w-md rounded-xl border border-bank-border bg-white p-5 shadow-[0_14px_36px_rgba(19,34,66,0.22)]">
            <h3 className="text-base font-semibold text-bank-ink">{promptDialog.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-bank-muted">{promptDialog.message}</p>

            <label htmlFor="prompt-dialog-input" className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-bank-muted">
              Nosaukums
              <input
                id="prompt-dialog-input"
                aria-label="Nosaukums"
                autoFocus
                maxLength={promptDialog.maxLength}
                placeholder={promptDialog.placeholder}
                value={promptValue}
                onChange={(event) => setPromptValue(event.target.value)}
                className="mt-1 w-full rounded-lg border border-bank-border bg-bank-panel-soft px-3 py-2 text-sm"
              />
            </label>
            <p className="mt-1 text-right text-[11px] text-bank-muted">
              {promptValue.trim().length}/{promptDialog.maxLength}
            </p>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => resolvePromptDialog(null)}
                className="rounded-lg border border-bank-border px-3 py-2 text-sm font-semibold text-bank-ink transition hover:bg-bank-panel-soft"
              >
                Atcelt
              </button>
              <button
                onClick={() => resolvePromptDialog(promptValue)}
                disabled={promptValue.trim().length === 0}
                className="rounded-lg bg-bank-cosmic px-3 py-2 text-sm font-semibold text-white transition hover:bg-bank-cosmic-soft disabled:cursor-not-allowed disabled:opacity-55"
              >
                {promptDialog.confirmLabel ?? 'Saglabāt'}
              </button>
            </div>
          </article>
        </div>
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
