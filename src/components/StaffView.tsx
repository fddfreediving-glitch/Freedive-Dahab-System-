import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Language, translations } from '../i18n';
import {
  UserCheck,
  Plus,
  Shield,
  Phone,
  Mail,
  Award,
  Globe,
  DollarSign,
  Lock,
  X,
} from 'lucide-react';

interface StaffViewProps {
  staff: User[];
  userRole: UserRole;
  onRefresh: () => void;
  onCreateStaff: (staffData: any) => Promise<void>;
  lang: Language;
}

export const StaffView: React.FC<StaffViewProps> = ({
  staff,
  userRole,
  onRefresh,
  onCreateStaff,
  lang,
}) => {
  const t = translations[lang];
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canManageStaff = ['owner', 'hr'].includes(userRole);
  const canSeeSalaries = ['owner', 'finance', 'hr'].includes(userRole);

  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'instructor' as UserRole,
    phone: '',
    languages: ['English'],
    certifications: ['AIDA Instructor', 'First Aid EFR'],
    monthly_salary: 950,
    hourly_rate: 25,
    session_commission: 35,
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await onCreateStaff(newStaff);
      setIsAddModalOpen(false);
      setNewStaff({
        full_name: '',
        email: '',
        password: '',
        role: 'instructor',
        phone: '',
        languages: ['English'],
        certifications: ['AIDA Instructor', 'First Aid EFR'],
        monthly_salary: 950,
        hourly_rate: 25,
        session_commission: 35,
      });
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8EEF7] dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-[#28334E] dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#4C8BF5]" />
            <span>Instructors & Center Staff</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational personnel, teaching credentials, languages, and role-based authorization.
          </p>
        </div>

        {canManageStaff && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff Account</span>
          </button>
        )}
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((u) => {
          const initials = u.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2);
          const certs = Array.isArray(u.certifications) ? u.certifications : [];
          const langs = Array.isArray(u.languages) ? u.languages : [];

          return (
            <div
              key={u.id}
              className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 hover:border-[#4C8BF5]/40 transition-all flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div className="space-y-3">
                {/* Header Profile */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#4C8BF5] flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#28334E] dark:text-white">{u.full_name}</h3>
                    <div className="inline-flex items-center gap-1 text-[11px] font-mono uppercase text-[#4C8BF5] font-bold">
                      <Shield className="w-3 h-3" />
                      <span>{u.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-[#4C8BF5]" />
                    <span>{u.email}</span>
                  </div>
                  {u.phone && (
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-[#4C8BF5]" />
                      <span>{u.phone}</span>
                    </div>
                  )}
                </div>

                {/* Languages */}
                {langs.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Globe className="w-3.5 h-3.5 text-teal-500" />
                    <span className="text-slate-700 dark:text-slate-300">{langs.join(', ')}</span>
                  </div>
                )}

                {/* Certifications & Specialties */}
                {certs.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Award className="w-3 h-3 text-amber-500" />
                      <span>Qualifications</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {certs.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-[#4C8BF5] dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Compensation details (Restricted) */}
              <div className="pt-3 border-t border-[#E8EEF7] dark:border-slate-800">
                {canSeeSalaries ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Base Salary:</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      €{u.monthly_salary || 0} / mo
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 italic">
                    <Lock className="w-3 h-3" />
                    <span>Compensation details restricted by role.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-slate-700 dark:text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-[#E8EEF7] dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#071322]">
              <h3 className="text-base font-bold text-[#28334E] dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#4C8BF5]" />
                <span>Create Staff Account</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                  placeholder="e.g. Omar Hassan"
                  className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Email (Login) *</label>
                  <input
                    type="email"
                    required
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    placeholder="omar.instructor@freedivedahab.com"
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Assigned Role *</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
                  >
                    <option value="instructor">Senior / Staff Instructor</option>
                    <option value="operations_manager">Operations Manager</option>
                    <option value="front_desk_crm">Front Desk / CRM</option>
                    <option value="finance">Finance Manager</option>
                    <option value="hr">Human Resources</option>
                    <option value="equipment_manager">Equipment Manager</option>
                    <option value="owner">Center Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    placeholder="+20 100..."
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Base Monthly Salary (EUR)</label>
                  <input
                    type="number"
                    value={newStaff.monthly_salary}
                    onChange={(e) => setNewStaff({ ...newStaff, monthly_salary: Number(e.target.value) })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Session Commission (EUR)</label>
                  <input
                    type="number"
                    value={newStaff.session_commission}
                    onChange={(e) => setNewStaff({ ...newStaff, session_commission: Number(e.target.value) })}
                    className="w-full bg-[#F4F6FA] dark:bg-[#071322] border border-[#E8EEF7] dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8EEF7] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
