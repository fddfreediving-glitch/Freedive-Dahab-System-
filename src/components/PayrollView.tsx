import React, { useState } from 'react';
import { PayrollPeriod, PayrollRecord, UserRole } from '../types';
import { Language, translations } from '../i18n';
import {
  DollarSign,
  Calendar,
  CheckCircle,
  AlertCircle,
  Lock,
  Plus,
  Edit2,
  FileText,
  ShieldCheck,
  X,
} from 'lucide-react';

interface PayrollViewProps {
  periods: PayrollPeriod[];
  records: PayrollRecord[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  userRole: UserRole;
  onRefresh: () => void;
  onCreatePeriod: (periodData: any) => Promise<void>;
  onUpdateRecord: (recordId: string, recordData: any) => Promise<void>;
  onApprovePeriod: (periodId: string) => Promise<void>;
  lang: Language;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  periods,
  records,
  selectedPeriodId,
  onSelectPeriod,
  userRole,
  onRefresh,
  onCreatePeriod,
  onUpdateRecord,
  onApprovePeriod,
  lang,
}) => {
  const t = translations[lang];
  const canAccessPayroll = ['owner', 'finance', 'hr'].includes(userRole);
  const isOwner = userRole === 'owner';

  const [isNewPeriodModalOpen, setIsNewPeriodModalOpen] = useState(false);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<PayrollRecord | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New period state
  const [newPeriod, setNewPeriod] = useState({
    period_name: 'November 2026',
    start_date: '2026-11-01',
    end_date: '2026-11-30',
    notes: 'Standard monthly payroll and session commissions.',
  });

  // Edit record state
  const [editData, setEditData] = useState({
    base_salary: 0,
    sessions_taught: 0,
    session_commission: 0,
    bonuses: 0,
    deductions: 0,
    tax_withholding: 0,
    notes: '',
  });

  if (!canAccessPayroll) {
    return (
      <div className="p-8 rounded-2xl bg-[#091728] border border-cyan-900/50 text-center max-w-xl mx-auto space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied: Staff Compensation & Payroll</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Employee salaries, commissions, and payroll registers are strictly confidential and restricted to Center Owners, Finance, and HR.
        </p>
      </div>
    );
  }

  const activePeriod = periods.find((p) => p.id === selectedPeriodId) || periods[0];

  const handleCreatePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await onCreatePeriod(newPeriod);
      setIsNewPeriodModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to initialize period');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForEdit) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await onUpdateRecord(selectedRecordForEdit.id, editData);
      setSelectedRecordForEdit(null);
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update payroll record');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (rec: PayrollRecord) => {
    setSelectedRecordForEdit(rec);
    setEditData({
      base_salary: rec.base_salary,
      sessions_taught: rec.sessions_taught,
      session_commission: rec.session_commission,
      bonuses: rec.bonuses,
      deductions: rec.deductions,
      tax_withholding: rec.tax_withholding,
      notes: rec.notes || '',
    });
  };

  const handleApprove = async () => {
    if (!activePeriod) return;
    const confirmed = window.confirm(
      `Are you sure you want to approve payroll for "${activePeriod.period_name}"? This action is cryptographically logged in the audit trail.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      await onApprovePeriod(activePeriod.id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalGrossPeriod = records.reduce((acc, r) => acc + r.gross_pay, 0);
  const totalNetPeriod = records.reduce((acc, r) => acc + r.net_pay, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8EEF7] dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-[#28334E] dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#4C8BF5]" />
            <span>Staff Payroll & Compensation</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configurable salary, session-based commissions, adjustments, and owner authorization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setIsNewPeriodModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Initialize Pay Period</span>
            </button>
          )}
        </div>
      </div>

      {/* Statutory / Tax Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-amber-800 dark:text-amber-300 font-bold">Egyptian Statutory & Tax Notice:</strong>
          <p className="text-[11px] text-amber-700 dark:text-amber-200/80 leading-relaxed">
            Statutory income tax, social insurance, and syndicate withholdings in Egypt vary based on residential contracts vs independent instructor commissions. The calculations here are configurable and must be reviewed by a qualified local accountant or legal counsel.
          </p>
        </div>
      </div>

      {/* Pay Periods Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {periods.map((p) => {
          const isSelected = p.id === activePeriod?.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPeriod(p.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#4C8BF5] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-[#E8EEF7] dark:border-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{p.period_name}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                p.status === 'approved' 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {p.status}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Period Overview Banner */}
      {activePeriod && (
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1427] border border-[#e4e8ec] dark:border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{activePeriod.period_name}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                activePeriod.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
              }`}>
                {activePeriod.status}
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {activePeriod.start_date} to {activePeriod.end_date} • {records.length} staff records
              {activePeriod.approved_by_name && (
                <span className="text-emerald-600 dark:text-emerald-400 ml-2 font-medium">
                  (Approved by {activePeriod.approved_by_name})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Total Net Payroll:</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                €{totalNetPeriod.toLocaleString()}
              </div>
            </div>

            {isOwner && activePeriod.status !== 'approved' && (
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer transition-colors"
              >
                {submitting ? 'Approving...' : 'Approve Payroll ✓'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white dark:bg-[#0c1427] border border-[#e4e8ec] dark:border-[#1e293b] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-[#f8f9fa] dark:bg-[#071424] text-slate-600 dark:text-slate-300 font-bold border-b border-[#e4e8ec] dark:border-[#1e293b] uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Base Salary</th>
                <th className="py-3.5 px-4">Taught Sessions</th>
                <th className="py-3.5 px-4">Commission</th>
                <th className="py-3.5 px-4">Bonuses</th>
                <th className="py-3.5 px-4">Deductions</th>
                <th className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">Net Pay</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EEF7] dark:divide-slate-800">
              {records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-[#0e213b]/60 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#28334E] dark:text-white">{rec.full_name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{rec.email}</div>
                  </td>
                  <td className="py-3 px-4 text-[#4C8BF5] font-medium capitalize">
                    {rec.role.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-900 dark:text-white">
                    €{rec.base_salary}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                    {rec.sessions_taught} sessions
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                    +€{rec.sessions_taught * rec.session_commission}
                  </td>
                  <td className="py-3 px-4 font-mono text-[#4C8BF5]">
                    +€{rec.bonuses}
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-600 dark:text-rose-400">
                    {rec.deductions > 0 ? `-€${rec.deductions}` : '€0'}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    €{rec.net_pay}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {activePeriod?.status !== 'approved' && (
                      <button
                        onClick={() => openEditModal(rec)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 text-[#4C8BF5] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-medium cursor-pointer"
                      >
                        Adjust
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST RECORD MODAL */}
      {selectedRecordForEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-slate-700 dark:text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-[#E8EEF7] dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#071322]">
              <div>
                <h3 className="text-base font-bold text-[#28334E] dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#4C8BF5]" />
                  <span>Adjust Staff Compensation</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{selectedRecordForEdit.full_name}</p>
              </div>
              <button
                onClick={() => setSelectedRecordForEdit(null)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditRecordSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Base Monthly Salary (€)</label>
                  <input
                    type="number"
                    value={editData.base_salary}
                    onChange={(e) => setEditData({ ...editData, base_salary: Number(e.target.value) })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Sessions Taught</label>
                  <input
                    type="number"
                    value={editData.sessions_taught}
                    onChange={(e) => setEditData({ ...editData, sessions_taught: Number(e.target.value) })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Commission per Session (€)</label>
                  <input
                    type="number"
                    value={editData.session_commission}
                    onChange={(e) => setEditData({ ...editData, session_commission: Number(e.target.value) })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Bonuses / Incentives (€)</label>
                  <input
                    type="number"
                    value={editData.bonuses}
                    onChange={(e) => setEditData({ ...editData, bonuses: Number(e.target.value) })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Deductions (€)</label>
                  <input
                    type="number"
                    value={editData.deductions}
                    onChange={(e) => setEditData({ ...editData, deductions: Number(e.target.value) })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Reviewable Tax Withholding (€)</label>
                  <input
                    type="number"
                    value={editData.tax_withholding}
                    onChange={(e) => setEditData({ ...editData, tax_withholding: Number(e.target.value) })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Audit Ledger Notes</label>
                <input
                  type="text"
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="e.g. Safety lead bonus for Blue Hole session"
                  className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8EEF7] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForEdit(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {submitting ? 'Saving...' : 'Save Adjustments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PERIOD MODAL */}
      {isNewPeriodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091728] border border-cyan-800/60 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-cyan-900/50 flex items-center justify-between bg-[#071322]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Initialize Pay Period</span>
              </h3>
              <button
                onClick={() => setIsNewPeriodModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePeriodSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Period Name *</label>
                <input
                  type="text"
                  required
                  value={newPeriod.period_name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, period_name: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newPeriod.start_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newPeriod.end_date}
                    onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={newPeriod.notes}
                  onChange={(e) => setNewPeriod({ ...newPeriod, notes: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/50">
                <button
                  type="button"
                  onClick={() => setIsNewPeriodModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#071322] font-semibold cursor-pointer shadow-md"
                >
                  {submitting ? 'Initializing...' : 'Initialize Period'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
