import React, { useState } from 'react';
import { UserRole } from '../types';
import { Language, translations } from '../i18n';
import {
  Sliders,
  Download,
  Database,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Server,
} from 'lucide-react';
import { apiRequest } from '../api';

interface SettingsViewProps {
  userRole: UserRole;
  lang: Language;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userRole,
  lang,
}) => {
  const t = translations[lang];
  const isOwner = userRole === 'owner';
  const [downloading, setDownloading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [settings, setSettings] = useState({
    timezone: 'Africa/Cairo',
    center_name: 'Freedive Dahab',
    currency_primary: 'EUR',
    currency_secondary: 'EGP',
    default_vat_rate: '0.00',
    dive_sites: 'Blue Hole, Lighthouse Bay, Eel Garden, The Canyon, The Bells, Ras Abu Galum',
  });

  const handleExportBackup = async () => {
    setDownloading(true);
    try {
      const data = await apiRequest('/api/backup/export');
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
      alert(err.message || 'Backup export failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ settings }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-[#E8EEF7] dark:border-slate-800">
        <h2 className="text-xl font-black text-[#28334E] dark:text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-[#4C8BF5]" />
          <span>System Settings & Operational Configuration</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Timezone parameters, billing currencies, dive site spots, and persistent database backups.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>System configuration updated successfully on server.</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 rounded-2xl p-6 space-y-5 text-xs shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E8EEF7] dark:border-slate-800">
          <Clock className="w-4 h-4 text-[#4C8BF5]" />
          <h3 className="text-sm font-extrabold text-[#28334E] dark:text-white">Regional & Operational Parameters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Center Display Name</label>
            <input
              type="text"
              disabled={!isOwner}
              value={settings.center_name}
              onChange={(e) => setSettings({ ...settings, center_name: e.target.value })}
              className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Configured Timezone</label>
            <select
              disabled={!isOwner}
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] disabled:opacity-60"
            >
              <option value="Africa/Cairo">Africa/Cairo (Egypt EET/EEST UTC+2/3)</option>
              <option value="UTC">UTC (Universal Coordinated Time)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Primary Currency</label>
            <input
              type="text"
              disabled={!isOwner}
              value={settings.currency_primary}
              onChange={(e) => setSettings({ ...settings, currency_primary: e.target.value })}
              className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Secondary Currency</label>
            <input
              type="text"
              disabled={!isOwner}
              value={settings.currency_secondary}
              onChange={(e) => setSettings({ ...settings, currency_secondary: e.target.value })}
              className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Reviewable VAT Rate (%)</label>
            <input
              type="text"
              disabled={!isOwner}
              value={settings.default_vat_rate}
              onChange={(e) => setSettings({ ...settings, default_vat_rate: e.target.value })}
              className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Active Dahab Dive Locations</label>
          <input
            type="text"
            disabled={!isOwner}
            value={settings.dive_sites}
            onChange={(e) => setSettings({ ...settings, dive_sites: e.target.value })}
            className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] disabled:opacity-60"
          />
        </div>

        {isOwner && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              Save Regional Settings
            </button>
          </div>
        )}
      </form>

      {/* Database Backup & Disaster Recovery Section */}
      <div className="bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E8EEF7] dark:border-slate-800">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-extrabold text-[#28334E] dark:text-white">Persistent Storage & Backup Protocol</h3>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          The ERP system uses an atomic, transactional SQLite storage engine running with Write-Ahead Logging (<code className="font-mono text-[#4C8BF5] font-bold">WAL mode</code>) and strict foreign key integrity. To safeguard customer billing, student dossiers, and payroll registers, Center Owners can download a complete JSON database snapshot at any time.
        </p>

        <div className="p-4 rounded-xl bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Full System Export Snapshot</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Includes all students, CRM inquiries, courses, schedules, invoices, payments, expenses, equipment inventory, and audit logs.
              </div>
            </div>

            {isOwner ? (
              <button
                onClick={handleExportBackup}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Exporting...' : 'Export Snapshot (.json)'}</span>
              </button>
            ) : (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold italic">
                Export restricted to Center Owner role.
              </span>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <strong className="text-slate-700 dark:text-slate-300">Recommended Backup Best Practice:</strong>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li>Download a database snapshot at the end of each monthly payroll cycle.</li>
            <li>Store backup archives in an encrypted external storage volume.</li>
            <li>Verify invoice numbers and payment reconciliations before clearing seasonal records.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
