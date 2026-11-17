import React, { useEffect, useState } from 'react';
import { UserRole } from '../types';
import { Language, translations } from '../i18n';
import {
  Sliders,
  Download,
  Database,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Banknote,
  Bell,
  HardDrive,
  Check,
  Minus,
  Lock,
  FileDown,
} from 'lucide-react';
import { apiRequest } from '../api';

interface SettingsViewProps {
  userRole: UserRole;
  lang: Language;
}

interface BookingSafetyRules {
  waiver_valid_days: number;
  minimum_deposit_percent: number;
  max_divers_per_buoy: number;
  ras_mohamed_min_participants: number;
}

interface CenterSettings {
  center_name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  currency_default: string;
  timezone: string;
  notify_deposit_reminders: string;
  notify_low_stock_alerts: string;
  notify_waiver_expiring: string;
  notify_daily_summary_email: string;
}

type SettingsSection = 'profile' | 'safety' | 'roles' | 'currency' | 'notifications' | 'data';

const SECTION_NAV: Array<{ id: SettingsSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'profile', label: 'Business Profile', icon: Building2 },
  { id: 'safety', label: 'Booking & Safety Rules', icon: Shield },
  { id: 'roles', label: 'Roles & Permissions', icon: Users },
  { id: 'currency', label: 'Currency & Exchange Rates', icon: Banknote },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data & Backup', icon: HardDrive },
];

const ROLE_COLUMNS: Array<{ id: string; label: string }> = [
  { id: 'owner', label: 'Owner' },
  { id: 'operations_manager', label: 'Ops Mgr' },
  { id: 'front_desk_crm', label: 'Front Desk' },
  { id: 'instructor', label: 'Instructor' },
  { id: 'finance', label: 'Finance' },
  { id: 'hr', label: 'HR' },
  { id: 'equipment_manager', label: 'Equipment' },
];

// Mirrors the requireRole checks in server/api.ts and the sidebar locks in
// ReferenceSidebar.tsx. Read-only documentation: enforcement is centralized
// in the server middleware, so these cells cannot be toggled from the UI.
const PERMISSION_MATRIX: Array<{ capability: string; note?: string; roles: Record<string, boolean> }> = [
  {
    capability: 'Customers',
    note: 'View & register (medical/waiver updates: owner, ops, front desk, HR)',
    roles: { owner: true, operations_manager: true, front_desk_crm: true, instructor: true, finance: true, hr: true, equipment_manager: true },
  },
  {
    capability: 'Bookings & Courses',
    note: 'Create & edit bookings, sessions and courses',
    roles: { owner: true, operations_manager: true, front_desk_crm: true, instructor: false, finance: false, hr: false, equipment_manager: false },
  },
  {
    capability: 'Daily Ops planner',
    note: 'Create activities (status updates open to all staff)',
    roles: { owner: true, operations_manager: true, front_desk_crm: false, instructor: true, finance: false, hr: false, equipment_manager: false },
  },
  {
    capability: 'POS & customer requests',
    note: 'Catalog write: owner & finance only',
    roles: { owner: true, operations_manager: false, front_desk_crm: true, instructor: false, finance: true, hr: false, equipment_manager: false },
  },
  {
    capability: 'Invoices & payments',
    roles: { owner: true, operations_manager: false, front_desk_crm: false, instructor: false, finance: true, hr: false, equipment_manager: false },
  },
  {
    capability: 'Expenses',
    roles: { owner: true, operations_manager: false, front_desk_crm: false, instructor: false, finance: true, hr: false, equipment_manager: false },
  },
  {
    capability: 'Cash & FX rates',
    roles: { owner: true, operations_manager: false, front_desk_crm: false, instructor: false, finance: true, hr: false, equipment_manager: false },
  },
  {
    capability: 'Payroll',
    note: 'Period approval: owner only',
    roles: { owner: true, operations_manager: false, front_desk_crm: false, instructor: false, finance: true, hr: true, equipment_manager: false },
  },
  {
    capability: 'Staff & HR',
    roles: { owner: true, operations_manager: false, front_desk_crm: false, instructor: false, finance: false, hr: true, equipment_manager: false },
  },
  {
    capability: 'Equipment',
    note: 'Inventory write (read: all staff)',
    roles: { owner: true, operations_manager: true, front_desk_crm: false, instructor: false, finance: false, hr: false, equipment_manager: true },
  },
  {
    capability: 'Reports',
    roles: { owner: true, operations_manager: false, front_desk_crm: false, instructor: false, finance: true, hr: false, equipment_manager: false },
  },
  {
    capability: 'Audit log',
    roles: { owner: true, operations_manager: false, front_desk_crm: false, instructor: false, finance: false, hr: false, equipment_manager: false },
  },
  {
    capability: 'Settings',
    note: 'Update (read: all staff)',
    roles: { owner: true, operations_manager: false, front_desk_crm: false, instructor: false, finance: false, hr: false, equipment_manager: false },
  },
];

const TIMEZONE_OPTIONS = [
  'Africa/Cairo',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
];

const CURRENCY_OPTIONS = ['EUR', 'EGP', 'USD', 'GBP'];

const NOTIFICATION_TOGGLES: Array<{ key: keyof CenterSettings; label: string; description: string }> = [
  { key: 'notify_deposit_reminders', label: 'Booking deposit reminders', description: 'Remind staff when a confirmed booking still has no deposit recorded.' },
  { key: 'notify_low_stock_alerts', label: 'Low stock alerts', description: 'Flag equipment that falls below its low-stock threshold.' },
  { key: 'notify_waiver_expiring', label: 'Waiver expiring soon', description: 'Flag customers whose medical waiver approaches its validity limit.' },
  { key: 'notify_daily_summary_email', label: 'Daily summary email', description: 'Send the owner a daily digest of bookings, payments and activities.' },
];

const inputClass =
  'w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] disabled:opacity-60 text-xs';

function isBookingSafetyRules(value: unknown): value is BookingSafetyRules {
  if (!value || typeof value !== 'object') return false;
  const rules = value as Record<string, unknown>;
  return typeof rules.waiver_valid_days === 'number' &&
    Number.isInteger(rules.waiver_valid_days) &&
    rules.waiver_valid_days >= 1 &&
    rules.waiver_valid_days <= 3650 &&
    typeof rules.minimum_deposit_percent === 'number' &&
    Number.isFinite(rules.minimum_deposit_percent) &&
    rules.minimum_deposit_percent >= 1 &&
    rules.minimum_deposit_percent <= 100 &&
    typeof rules.max_divers_per_buoy === 'number' &&
    Number.isInteger(rules.max_divers_per_buoy) &&
    rules.max_divers_per_buoy >= 1 &&
    rules.max_divers_per_buoy <= 10 &&
    typeof rules.ras_mohamed_min_participants === 'number' &&
    Number.isInteger(rules.ras_mohamed_min_participants) &&
    rules.ras_mohamed_min_participants >= 1 &&
    rules.ras_mohamed_min_participants <= 100;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userRole,
  lang,
}) => {
  const t = translations[lang];
  const isOwner = userRole === 'owner';
  const canManageFinance = isOwner || userRole === 'finance';
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [savedSection, setSavedSection] = useState<SettingsSection | null>(null);

  // Business profile (center_settings table)
  const [centerSettings, setCenterSettings] = useState<CenterSettings>({
    center_name: 'Freedive Dahab',
    address: 'Dahab, South Sinai, Egypt',
    phone: '',
    whatsapp: '',
    email: '',
    currency_default: 'EUR',
    timezone: 'Africa/Cairo',
    notify_deposit_reminders: 'true',
    notify_low_stock_alerts: 'true',
    notify_waiver_expiring: 'true',
    notify_daily_summary_email: 'false',
  });

  // Booking safety rules (settings.booking_safety_rules)
  const [bookingSafetyRules, setBookingSafetyRules] = useState<BookingSafetyRules>({
    waiver_valid_days: 365,
    minimum_deposit_percent: 30,
    max_divers_per_buoy: 3,
    ras_mohamed_min_participants: 4,
  });

  // FX rates (/api/finance/fx-rates)
  const [fxRates, setFxRates] = useState<{ rates_to_eur: Record<string, number | null>; updated_at?: string; updated_by_name?: string } | null>(null);
  const [fxEditable, setFxEditable] = useState<Record<string, string>>({ USD: '', EGP: '', GBP: '' });

  const [downloading, setDownloading] = useState(false);
  const [downloadingAudit, setDownloadingAudit] = useState(false);

  const showSaved = (section: SettingsSection) => {
    setSavedSection(section);
    setTimeout(() => setSavedSection((current) => (current === section ? null : current)), 3000);
  };

  useEffect(() => {
    let active = true;
    apiRequest<{ settings: Record<string, string> }>('/api/settings/center')
      .then((response) => {
        if (!active || !response.settings) return;
        setCenterSettings((current) => ({ ...current, ...response.settings }));
      })
      .catch(() => {
        // Older servers without the endpoint keep the local defaults.
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeSection !== 'safety') return;
    let active = true;
    apiRequest<Record<string, string>>('/api/settings')
      .then((storedSettings) => {
        if (!active) return;
        if (storedSettings.booking_safety_rules) {
          const parsed: unknown = JSON.parse(storedSettings.booking_safety_rules);
          if (isBookingSafetyRules(parsed)) {
            setBookingSafetyRules(parsed);
          } else {
            setSectionError('Saved booking safety rules are invalid. An owner must correct them before bookings can proceed.');
          }
        }
      })
      .catch((err: Error) => {
        if (active) setSectionError(err.message || 'Failed to load system settings');
      });
    return () => {
      active = false;
    };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'currency' || !canManageFinance) return;
    let active = true;
    apiRequest<{ rates_to_eur: Record<string, number | null>; updated_at?: string; updated_by_name?: string }>('/api/finance/fx-rates')
      .then((rates) => {
        if (!active) return;
        setFxRates(rates);
        setFxEditable({
          USD: rates.rates_to_eur.USD === null ? '' : String(rates.rates_to_eur.USD),
          EGP: rates.rates_to_eur.EGP === null ? '' : String(rates.rates_to_eur.EGP),
          GBP: rates.rates_to_eur.GBP === null ? '' : String(rates.rates_to_eur.GBP),
        });
      })
      .catch((err: Error) => {
        if (active) setSectionError(err.message || 'Failed to load exchange rates');
      });
    return () => {
      active = false;
    };
  }, [activeSection, canManageFinance]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectionError(null);
    try {
      await apiRequest('/api/settings/center', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            center_name: centerSettings.center_name,
            address: centerSettings.address,
            phone: centerSettings.phone,
            whatsapp: centerSettings.whatsapp,
            email: centerSettings.email,
            currency_default: centerSettings.currency_default,
            timezone: centerSettings.timezone,
          },
        }),
      });
      showSaved('profile');
    } catch (err: any) {
      setSectionError(err.message || 'Failed to save business profile');
    }
  };

  const handleSaveSafetyRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectionError(null);
    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ settings: { booking_safety_rules: bookingSafetyRules } }),
      });
      showSaved('safety');
    } catch (err: any) {
      setSectionError(err.message || 'Failed to save booking safety rules');
    }
  };

  const handleSaveFxRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectionError(null);
    try {
      const toRate = (raw: string) => {
        const trimmed = raw.trim();
        return trimmed === '' ? null : Number(trimmed);
      };
      const saved = await apiRequest<{ rates_to_eur: Record<string, number | null>; updated_at: string; updated_by_name: string }>(
        '/api/finance/fx-rates',
        {
          method: 'PUT',
          body: JSON.stringify({
            rates_to_eur: { EUR: 1, USD: toRate(fxEditable.USD), EGP: toRate(fxEditable.EGP), GBP: toRate(fxEditable.GBP) },
          }),
        },
      );
      setFxRates(saved);
      showSaved('currency');
    } catch (err: any) {
      setSectionError(err.message || 'Failed to save exchange rates');
    }
  };

  const handleToggleNotification = async (key: keyof CenterSettings, value: boolean) => {
    if (!isOwner) return;
    setSectionError(null);
    const previous = centerSettings[key];
    setCenterSettings((current) => ({ ...current, [key]: String(value) }));
    try {
      await apiRequest('/api/settings/center', {
        method: 'PUT',
        body: JSON.stringify({ settings: { [key]: value } }),
      });
      showSaved('notifications');
    } catch (err: any) {
      setCenterSettings((current) => ({ ...current, [key]: previous }));
      setSectionError(err.message || 'Failed to save notification preference');
    }
  };

  const handleExportBackup = async () => {
    setDownloading(true);
    try {
      const data = await apiRequest('/api/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `freedive_dahab_erp_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSectionError(err.message || 'Backup export failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAuditCsv = async () => {
    setDownloadingAudit(true);
    try {
      const logs = await apiRequest<Array<Record<string, unknown>>>('/api/audit-logs?limit=5000');
      const columns = ['id', 'created_at', 'user_email', 'user_role', 'action', 'entity_type', 'entity_id', 'details', 'ip'];
      const escape = (value: unknown) => {
        const raw = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
        return `"${raw.replace(/"/g, '""')}"`;
      };
      const csv = [columns.join(','), ...logs.map((log) => columns.map((column) => escape(log[column])).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `freedive_dahab_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setSectionError(err.message || 'Audit log download failed');
    } finally {
      setDownloadingAudit(false);
    }
  };

  const cardClass = 'bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 rounded-2xl p-6 shadow-xs';

  const renderSaved = (section: SettingsSection) =>
    savedSection === section ? (
      <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span>Saved successfully on the server.</span>
      </div>
    ) : null;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="pb-2 border-b border-[#E8EEF7] dark:border-slate-800">
        <h2 className="text-xl font-black text-[#28334E] dark:text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#4C8BF5]" />
          <span>Settings</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Business profile, booking safety gates, staff permissions, exchange rates, notifications and data backup.
        </p>
      </div>

      {sectionError && (
        <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {sectionError}
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sub-navigation */}
        <nav aria-label="Settings sections" className="w-full md:w-56 shrink-0 md:sticky md:top-4">
          <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 no-scrollbar">
            {SECTION_NAV.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(section.id);
                    setSectionError(null);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#4C8BF5] text-white shadow-md shadow-blue-500/20'
                      : 'bg-white dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-[#E8EEF7] dark:border-slate-800 hover:border-[#4C8BF5] hover:text-[#4C8BF5]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{section.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Active section */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          {/* 1. Business profile */}
          {activeSection === 'profile' && (
            <form onSubmit={handleSaveProfile} className={`${cardClass} space-y-5`}>
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8EEF7] dark:border-slate-800">
                <Building2 className="w-4 h-4 text-[#4C8BF5]" />
                <h3 className="text-sm font-extrabold text-[#28334E] dark:text-white">Business Profile</h3>
              </div>
              {renderSaved('profile')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="center-name" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Center Name</label>
                  <input
                    id="center-name"
                    type="text"
                    required
                    disabled={!isOwner}
                    value={centerSettings.center_name}
                    onChange={(e) => setCenterSettings({ ...centerSettings, center_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="center-email" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Email</label>
                  <input
                    id="center-email"
                    type="email"
                    disabled={!isOwner}
                    value={centerSettings.email}
                    onChange={(e) => setCenterSettings({ ...centerSettings, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="center-address" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Address</label>
                  <input
                    id="center-address"
                    type="text"
                    disabled={!isOwner}
                    value={centerSettings.address}
                    onChange={(e) => setCenterSettings({ ...centerSettings, address: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="center-phone" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Phone</label>
                  <input
                    id="center-phone"
                    type="text"
                    disabled={!isOwner}
                    value={centerSettings.phone}
                    onChange={(e) => setCenterSettings({ ...centerSettings, phone: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="center-whatsapp" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">WhatsApp Business Number</label>
                  <input
                    id="center-whatsapp"
                    type="text"
                    disabled={!isOwner}
                    value={centerSettings.whatsapp}
                    onChange={(e) => setCenterSettings({ ...centerSettings, whatsapp: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="center-currency" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Default Currency</label>
                  <select
                    id="center-currency"
                    disabled={!isOwner}
                    value={centerSettings.currency_default}
                    onChange={(e) => setCenterSettings({ ...centerSettings, currency_default: e.target.value })}
                    className={inputClass}
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="center-timezone" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Timezone</label>
                  <select
                    id="center-timezone"
                    disabled={!isOwner}
                    value={centerSettings.timezone}
                    onChange={(e) => setCenterSettings({ ...centerSettings, timezone: e.target.value })}
                    className={inputClass}
                  >
                    {TIMEZONE_OPTIONS.map((timezone) => (
                      <option key={timezone} value={timezone}>{timezone}</option>
                    ))}
                  </select>
                </div>
              </div>
              {isOwner ? (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    Save Business Profile
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Only the center owner can edit the business profile.
                </p>
              )}
            </form>
          )}

          {/* 2. Booking & safety rules */}
          {activeSection === 'safety' && (
            <form onSubmit={handleSaveSafetyRules} className={`${cardClass} space-y-5`}>
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8EEF7] dark:border-slate-800">
                <Shield className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-[#28334E] dark:text-white">Booking &amp; Safety Rules</h3>
              </div>
              {renderSaved('safety')}
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                These owner-managed thresholds are enforced by the server before course bookings are confirmed.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="waiver-valid-days" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Waiver validity (days)</label>
                  <input
                    id="waiver-valid-days"
                    type="number"
                    min={1}
                    max={3650}
                    step={1}
                    disabled={!isOwner}
                    value={bookingSafetyRules.waiver_valid_days}
                    onChange={(event) => setBookingSafetyRules({ ...bookingSafetyRules, waiver_valid_days: Number(event.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="minimum-deposit-percent" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Minimum deposit (%)</label>
                  <input
                    id="minimum-deposit-percent"
                    type="number"
                    min={1}
                    max={100}
                    step={0.1}
                    disabled={!isOwner}
                    value={bookingSafetyRules.minimum_deposit_percent}
                    onChange={(event) => setBookingSafetyRules({ ...bookingSafetyRules, minimum_deposit_percent: Number(event.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="max-divers-per-buoy" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Maximum divers per buoy</label>
                  <input
                    id="max-divers-per-buoy"
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    disabled={!isOwner}
                    value={bookingSafetyRules.max_divers_per_buoy}
                    onChange={(event) => setBookingSafetyRules({ ...bookingSafetyRules, max_divers_per_buoy: Number(event.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ras-min-participants" className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Ras Mohamed minimum group size</label>
                  <input
                    id="ras-min-participants"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    disabled={!isOwner}
                    value={bookingSafetyRules.ras_mohamed_min_participants}
                    onChange={(event) => setBookingSafetyRules({ ...bookingSafetyRules, ras_mohamed_min_participants: Number(event.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>
              {isOwner ? (
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    Save Safety Rules
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Only the center owner can edit safety rules.
                </p>
              )}
            </form>
          )}

          {/* 3. Roles & permissions (read-only) */}
          {activeSection === 'roles' && (
            <div className={`${cardClass} space-y-5`}>
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8EEF7] dark:border-slate-800">
                <Users className="w-4 h-4 text-[#4C8BF5]" />
                <h3 className="text-sm font-extrabold text-[#28334E] dark:text-white">Roles &amp; Permissions</h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                This matrix documents the role checks enforced by the server on every endpoint (and mirrored by the sidebar locks).
                Permissions are centralized in server middleware, so they cannot be toggled here — changing them requires a code change and
                owner review. A blue check means the role is allowed; a dash means the sidebar entry or API rejects the action.
              </p>
              <div className="overflow-x-auto rounded-xl border border-[#E8EEF7] dark:border-slate-800">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-[#F4F6FA] dark:bg-[#071322] text-slate-500 dark:text-slate-400">
                      <th className="text-left font-bold px-3 py-2.5 sticky left-0 bg-[#F4F6FA] dark:bg-[#071322]">Capability</th>
                      {ROLE_COLUMNS.map((role) => (
                        <th key={role.id} className="text-center font-bold px-2 py-2.5 min-w-[64px]">{role.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_MATRIX.map((row, rowIndex) => (
                      <tr
                        key={row.capability}
                        className={rowIndex % 2 === 0
                          ? 'bg-white dark:bg-[#1E293B]'
                          : 'bg-[#F8FAFD] dark:bg-[#162033]'}
                      >
                        <td className="px-3 py-2.5 sticky left-0 bg-inherit">
                          <div className="font-bold text-slate-700 dark:text-slate-200">{row.capability}</div>
                          {row.note && <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">{row.note}</div>}
                        </td>
                        {ROLE_COLUMNS.map((role) => (
                          <td key={role.id} className="text-center px-2 py-2.5">
                            {row.roles[role.id] ? (
                              <Check className="w-4 h-4 text-[#4C8BF5] mx-auto" aria-label={`${role.label}: allowed`} />
                            ) : (
                              <Minus className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" aria-label={`${role.label}: not allowed`} />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                The owner role always has full access. Instructors and equipment managers see read-only views of customers and equipment;
                medical notes are further restricted to owner, operations manager and HR.
              </p>
            </div>
          )}

          {/* 4. Currency & exchange rates */}
          {activeSection === 'currency' && (
            <div className={`${cardClass} space-y-5`}>
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8EEF7] dark:border-slate-800">
                <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-extrabold text-[#28334E] dark:text-white">Currency &amp; Exchange Rates</h3>
              </div>
              {renderSaved('currency')}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                All rates are expressed as EUR per 1 unit of the currency. The rate in effect is captured on every payment when it is
                recorded, so historical payments never change value. Update today&apos;s rates below before recording EGP or USD payments.
              </p>
              {canManageFinance ? (
                <>
                  {fxRates ? (
                    <div className="overflow-x-auto rounded-xl border border-[#E8EEF7] dark:border-slate-800">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[#F4F6FA] dark:bg-[#071322] text-slate-500 dark:text-slate-400">
                            <th className="text-left font-bold px-3 py-2.5">Currency</th>
                            <th className="text-left font-bold px-3 py-2.5">Rate to EUR</th>
                            <th className="text-left font-bold px-3 py-2.5">1 EUR buys</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['EUR', 'USD', 'EGP', 'GBP'].map((currency) => {
                            const rate = fxRates.rates_to_eur[currency];
                            return (
                              <tr key={currency} className="border-t border-[#E8EEF7] dark:border-slate-800">
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">{currency}</td>
                                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                  {rate === null || rate === undefined ? (
                                    <span className="text-amber-600 dark:text-amber-400">Not set — set a rate when recording a payment</span>
                                  ) : (
                                    rate
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                                  {rate ? `${(1 / rate).toFixed(2)} ${currency}` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">Loading exchange rates…</p>
                  )}
                  {fxRates?.updated_at && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Last updated {new Date(fxRates.updated_at).toLocaleString()} by {fxRates.updated_by_name || 'staff'}.
                    </p>
                  )}
                  <form onSubmit={handleSaveFxRates} className="p-4 rounded-xl bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Update today&apos;s rates</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['USD', 'EGP', 'GBP'] as const).map((currency) => (
                        <div key={currency}>
                          <label htmlFor={`fx-${currency}`} className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                            {currency} per 1 EUR (EUR per 1 {currency} = 1 ÷ this)
                          </label>
                          <input
                            id={`fx-${currency}`}
                            type="number"
                            min={0}
                            step="any"
                            value={fxEditable[currency]}
                            onChange={(e) => setFxEditable({ ...fxEditable, [currency]: e.target.value })}
                            placeholder="Leave blank if unused"
                            className={inputClass}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Enter how much of each currency 1 EUR buys (for example 1 EUR = 52 EGP). The server stores the inverse rate on every payment, so historical payments never change value. Leave a currency blank to keep it unavailable until a rate is set while recording that payment.
                    </p>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                      >
                        Save Exchange Rates
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Exchange rates are visible to the owner and finance roles only.
                </p>
              )}
            </div>
          )}

          {/* 5. Notifications */}
          {activeSection === 'notifications' && (
            <div className={`${cardClass} space-y-5`}>
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8EEF7] dark:border-slate-800">
                <Bell className="w-4 h-4 text-[#4C8BF5]" />
                <h3 className="text-sm font-extrabold text-[#28334E] dark:text-white">Notifications</h3>
              </div>
              {renderSaved('notifications')}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Preferences are stored on the server and will drive alerts and the daily digest as soon as the notification sender is enabled.
              </p>
              <div className="space-y-3">
                {NOTIFICATION_TOGGLES.map((toggle) => {
                  const enabled = centerSettings[toggle.key] === 'true';
                  return (
                    <div
                      key={toggle.key}
                      className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{toggle.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{toggle.description}</div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={toggle.label}
                        disabled={!isOwner}
                        onClick={() => handleToggleNotification(toggle.key, !enabled)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 disabled:opacity-50 cursor-pointer ${
                          enabled ? 'bg-[#4C8BF5]' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                            enabled ? 'left-[22px]' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
              {!isOwner && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Only the center owner can change notification preferences.
                </p>
              )}
            </div>
          )}

          {/* 6. Data & backup */}
          {activeSection === 'data' && (
            <div className={`${cardClass} space-y-5`}>
              <div className="flex items-center gap-2 pb-3 border-b border-[#E8EEF7] dark:border-slate-800">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-extrabold text-[#28334E] dark:text-white">Data &amp; Backup</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                The ERP runs on a transactional SQLite database in WAL mode with strict foreign keys. The database file lives on the server at{' '}
                <code className="font-mono text-[#4C8BF5] font-bold">$DATA_DIR/freedive_dahab.db</code> (or{' '}
                <code className="font-mono text-[#4C8BF5] font-bold">data/freedive_dahab.db</code> under the server directory when DATA_DIR is not set).
              </p>
              <div className="p-4 rounded-xl bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Export all data (JSON)</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Full snapshot: students, inquiries, courses, bookings, invoices, payments, expenses, payroll, equipment, settings and audit logs.
                    </div>
                  </div>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      disabled={downloading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-colors whitespace-nowrap self-start sm:self-auto"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloading ? 'Exporting...' : 'Export all data (JSON)'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold italic">Owner only</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#E8EEF7] dark:border-slate-800 pt-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Download audit log (CSV)</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Every sign-in, booking, payment, expense and settings change, up to the latest 5,000 entries.
                    </div>
                  </div>
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={handleDownloadAuditCsv}
                      disabled={downloadingAudit}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E8EEF7] dark:border-slate-700 hover:border-[#4C8BF5] text-slate-700 dark:text-slate-200 font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap self-start sm:self-auto"
                    >
                      <FileDown className="w-4 h-4 text-[#4C8BF5]" />
                      <span>{downloadingAudit ? 'Preparing...' : 'Download audit log (CSV)'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold italic">Owner only</span>
                  )}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <strong className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Seeding note
                </strong>
                <p className="leading-relaxed">
                  Demo students, bookings and invoices are seeded automatically on the very first run so screens are not empty. Replace them
                  with real records before go-live — seeding never runs again once the database has users. Download a backup at the end of
                  each month and store it outside the server.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
