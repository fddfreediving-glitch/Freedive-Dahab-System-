import React, { useState } from 'react';
import { AuditLog, UserRole } from '../types';
import { Language, translations } from '../i18n';
import {
  ShieldAlert,
  Search,
  Filter,
  Lock,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface AuditViewProps {
  logs: AuditLog[];
  userRole: UserRole;
  onRefresh: () => void;
  lang: Language;
}

export const AuditView: React.FC<AuditViewProps> = ({
  logs,
  userRole,
  onRefresh,
  lang,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  if (userRole !== 'owner') {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-[#0c1427] border border-[#e4e8ec] dark:border-[#1e293b] text-center max-w-xl mx-auto space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Owner Authorization Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The cryptographic security and compliance audit trail is strictly reserved for the Freedive Dahab Center Owner.
        </p>
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_email && log.user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction =
      actionFilter === 'ALL' ||
      (actionFilter === 'AUTH' && (log.action.includes('LOGIN') || log.action.includes('AUTH') || log.action.includes('ROLE'))) ||
      (actionFilter === 'FINANCE' && (log.action.includes('INVOICE') || log.action.includes('PAYMENT') || log.action.includes('EXPENSE'))) ||
      (actionFilter === 'PAYROLL' && log.action.includes('PAYROLL')) ||
      (actionFilter === 'HEALTH' && log.action.includes('WAIVER'));

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8EEF7] dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-[#28334E] dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#4C8BF5]" />
            <span>Security & Compliance Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable log of staff sign-ins, permission changes, financial records, waivers, and payroll approvals.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-[#142242] text-slate-700 dark:text-slate-300 border border-[#E8EEF7] dark:border-slate-700 text-xs font-semibold cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Stream</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#1E293B] p-3 rounded-2xl border border-[#E8EEF7] dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by user, action, entity, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#4C8BF5]"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#4C8BF5] w-full sm:w-auto"
        >
          <option value="ALL">All Event Types</option>
          <option value="AUTH">Authentication & Role Events</option>
          <option value="FINANCE">Invoices & Payments</option>
          <option value="PAYROLL">Payroll Approvals</option>
          <option value="HEALTH">Medical Waivers</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-[#F4F6FA] dark:bg-[#071424] text-[#28334E] dark:text-slate-300 font-bold border-b border-[#E8EEF7] dark:border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp (UTC)</th>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Details / Metadata</th>
                <th className="py-3.5 px-4">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEF7] dark:divide-slate-800">
              {filteredLogs.map((log) => {
                const isDenial = log.action.includes('DENIED') || log.action.includes('FAILED');
                const isApproval = log.action.includes('APPROVE') || log.action.includes('SIGNED');

                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#0e213b]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {log.created_at?.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#28334E] dark:text-white">
                      {log.user_email || 'System'}
                    </td>
                    <td className="py-3 px-4 font-mono uppercase text-[10px] text-[#4C8BF5] font-bold">
                      {log.user_role || 'system'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                        isDenial
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : isApproval
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-blue-100 text-[#4C8BF5] dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300 max-w-xs truncate" title={log.details || ''}>
                      {log.details || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {log.ip || '127.0.0.1'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
