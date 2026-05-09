export interface UserRole {
  id: number;
  code: string;
  name_lv: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  preferred_currency: string;
  locale: 'lv' | 'en' | 'sv';
  timezone: string;
  date_format: 'dd.mm.yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy';
  amount_format: 'local' | 'international';
  address: string | null;
  phone: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  phone_country: string | null;
  theme_mode: 'light' | 'dark';
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_notifications: boolean;
  compact_mode: boolean;
  default_dashboard_view: 'overview' | 'accounts' | 'transactions';
  mask_balances: boolean;
  require_payment_confirmation: boolean;
  profile_picture: string | null;
  two_factor_enabled: boolean;
  two_factor_confirmed_at: string | null;
  email_verified_at: string | null;
  revision_requested_at?: string | null;
  status: string;
  role: UserRole | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  preferred_currency?: string;
  locale?: 'lv' | 'en' | 'sv';
  timezone?: string;
  date_format?: 'dd.mm.yyyy' | 'yyyy-mm-dd' | 'mm/dd/yyyy';
  amount_format?: 'local' | 'international';
  address?: string | null;
  phone?: string | null;
  region?: string | null;
  country?: string | null;
  postal_code?: string | null;
  phone_country?: string | null;
  theme_mode?: 'light' | 'dark';
  email_notifications?: boolean;
  push_notifications?: boolean;
  marketing_notifications?: boolean;
  compact_mode?: boolean;
  default_dashboard_view?: 'overview' | 'accounts' | 'transactions';
  mask_balances?: boolean;
  require_payment_confirmation?: boolean;
  profile_picture?: string | null;
  two_factor_enabled?: boolean;
  two_factor_confirmed_at?: string | null;
  email_verified_at?: string | null;
  revision_requested_at?: string | null;
  status: 'active' | 'blocked' | 'pending';
  created_at: string;
  updated_at: string;
  role: UserRole | null;
}

export interface AdminMetrics {
  users: {
    total: number;
    active: number;
    blocked: number;
    pending: number;
  };
  accounts: {
    total: number;
    active: number;
    frozen: number;
    closed: number;
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    rejected: number;
    failed: number;
  };
  approvals: {
    pending: number;
  };
  operations: {
    today_transactions: number;
    unread_notifications: number;
    audit_events_24h: number;
    outgoing_volume_30d: number;
  };
}

export type AccountType = 'personal' | 'business' | 'savings';
export type AccountStatus = 'active' | 'frozen' | 'closed';

export interface Account {
  id: number;
  owner_user_id: number;
  iban: string;
  name: string;
  currency: string;
  balance: string;
  type: AccountType;
  status: AccountStatus;
  access_role?: 'admin' | AccountMemberRole | 'none';
  can_initiate_transfer?: boolean;
  can_update_status?: boolean;
  can_close_account?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountMemberUser {
  id: number;
  name: string;
  email: string;
  status: string;
}

export interface MemberCandidate extends AccountMemberUser {
  role: UserRole | null;
}

export type AccountMemberRole = 'owner' | 'viewer' | 'operator' | 'approver';

export interface AccountMember {
  id: number;
  account_id: number;
  user_id: number;
  member_role: AccountMemberRole;
  daily_limit: string | null;
  created_at: string;
  updated_at: string;
  user?: AccountMemberUser;
}

export type TransactionCategory = 'transfer' | 'salary' | 'utilities' | 'shopping' | 'other';
export type TransactionStatus = 'pending' | 'completed' | 'rejected' | 'failed';

export interface Transaction {
  id: number;
  from_account_id: number;
  to_account_id: number;
  initiator_user_id: number | null;
  amount: string;
  fee: string;
  currency: string;
  category: TransactionCategory;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
  from_iban?: string;
  to_iban?: string;
  initiator_name?: string;
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  last_page: number;
  per_page: number;
  total: number;
}

export interface TransactionStats {
  totals: {
    inflow: number;
    outflow: number;
    net: number;
  };
  monthly_net: Record<string, number>;
  monthly_activity: Record<string, number>;
  recent_activity?: Record<string, number>;
  outgoing_by_category: Record<string, number>;
  transactions_by_status: Record<string, number>;
}

export type DashboardView = 'overview' | 'accounts' | 'transactions' | 'settings' | 'admin';

export interface AccountFilterState {
  q: string;
  status: '' | AccountStatus;
  type: '' | AccountType;
  currency: string;
  sort_by: 'created_at' | 'name' | 'balance' | 'status';
  sort_dir: 'asc' | 'desc';
}

export interface TransactionFilterState {
  q: string;
  account_id: string;
  status: '' | TransactionStatus;
  category: '' | TransactionCategory;
  amount_min: string;
  amount_max: string;
  date_from: string;
  date_to: string;
  sort_by: 'created_at' | 'executed_at' | 'amount' | 'status';
  sort_dir: 'asc' | 'desc';
}

export interface AdminFilterState {
  q: string;
  status: '' | 'active' | 'blocked' | 'pending';
  role_code: string;
  sort_by: 'created_at' | 'name' | 'email' | 'status';
  sort_dir: 'asc' | 'desc';
}

export interface NewAccountState {
  name: string;
  currency: string;
  type: AccountType;
}

export interface NewMemberState {
  user_id: string;
  member_role: Exclude<AccountMemberRole, 'owner'>;
  daily_limit: string;
}

export interface MemberEditState {
  member_role: Exclude<AccountMemberRole, 'owner'>;
  daily_limit: string;
}

export interface AdminUserEditState {
  role_id: string;
  status: AdminUser['status'];
}

export interface TransferFormState {
  from_account_id: string;
  to_account_id: string;
  recipient_query: string;
  amount: string;
  fee: string;
  category: TransactionCategory;
  description: string;
}

export interface TransferRecipient {
  id: number;
  name: string;
  iban: string;
  currency: string;
  owner_name?: string | null;
  is_accessible: boolean;
}
