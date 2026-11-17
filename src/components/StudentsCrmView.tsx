import React, { useEffect, useMemo, useState } from 'react';
import { Student, Inquiry, StudentRegistrationInput, UserRole } from '../types';
import { StudentRegistrationPage } from './StudentRegistrationPage';
import { Search, Plus, X, ShieldCheck, Lock, MoreHorizontal, Users } from 'lucide-react';

const formatShortDate = (value?: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';

const formatEuro = (value?: number | null) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(value ?? 0);

const activitySummary = (student: Student) => {
  const titles = Array.from(new Set((student.activities ?? []).map((activity) => activity.title)));
  if (titles.length === 0) return '—';
  if (titles.length <= 2) return titles.join(', ');
  return `${titles.slice(0, 2).join(', ')} +${titles.length - 2}`;
};

interface CustomerStayUpdate {
  whatsapp: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  needs_accommodation: number;
  needs_airport_transfer: number;
}

type MedicalClearanceStatus = 'unknown' | 'cleared' | 'physician_approved';

function isMedicalClearanceStatus(value: string): value is MedicalClearanceStatus {
  return ['unknown', 'cleared', 'physician_approved'].includes(value);
}

const STATUS_META: Record<
  Student['status'],
  { label: string; chip: string }
> = {
  lead: { label: 'Lead', chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  inquiry: { label: 'Inquiry', chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
  active: { label: 'Active', chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  certified: { label: 'Certified', chip: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' },
  inactive: { label: 'Inactive', chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' },
};

const STATUS_ORDER: Student['status'][] = ['lead', 'inquiry', 'active', 'certified', 'inactive'];

const CLEARANCE_LABEL: Record<MedicalClearanceStatus, string> = {
  unknown: 'Unknown / not cleared',
  cleared: 'Cleared',
  physician_approved: 'Physician approved',
};

interface StudentsCrmViewProps {
  students: Student[];
  inquiries: Inquiry[];
  userRole: UserRole;
  onRefresh: () => void;
  onRegisterStudent: (studentData: StudentRegistrationInput) => Promise<void>;
  onUpdateWaiver: (studentId: string, signed: boolean, notes?: string) => Promise<void>;
  onUpdateMedicalClearance: (studentId: string, status: MedicalClearanceStatus) => Promise<void>;
  onUpdateStay: (studentId: string, details: CustomerStayUpdate) => Promise<void>;
  onCreateInquiry: (inquiryData: any) => Promise<void>;
  onUpdateInquiryStatus: (inquiryId: string, status: string) => Promise<void>;
  lang: string;
}

export const StudentsCrmView: React.FC<StudentsCrmViewProps> = ({
  students,
  inquiries,
  userRole,
  onRefresh,
  onRegisterStudent,
  onUpdateWaiver,
  onUpdateMedicalClearance,
  onUpdateStay,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | Student['status']>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isRegistrationPageOpen, setIsRegistrationPageOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [stayForm, setStayForm] = useState({
    whatsapp: '',
    arrival_date: '',
    departure_date: '',
    needs_accommodation: false,
    needs_airport_transfer: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isHealthAuthorized = ['owner', 'operations_manager', 'hr'].includes(userRole);
  const canEditWaiver = ['owner', 'operations_manager', 'front_desk_crm'].includes(userRole);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: students.length };
    for (const status of STATUS_ORDER) {
      base[status] = students.filter((student) => student.status === status).length;
    }
    return base;
  }, [students]);

  const openInquiries = useMemo(
    () => inquiries.filter((inquiry) => !['booked', 'closed_lost'].includes(inquiry.status)).length,
    [inquiries]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      if (statusFilter !== 'all' && student.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = [
        student.first_name,
        student.last_name,
        student.email,
        student.phone,
        student.whatsapp,
        student.certification_agency,
        student.certification_level,
        ...(student.activities ?? []).map((activity) => activity.title),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [students, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));
  const safePage = Math.min(currentPage, pageCount);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filteredStudents.slice(pageStart, pageStart + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search, rowsPerPage]);

  const handleMedicalClearanceChange = async (status: MedicalClearanceStatus) => {
    if (!selectedStudent) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await onUpdateMedicalClearance(selectedStudent.id, status);
      setSelectedStudent({ ...selectedStudent, medical_clearance_status: status });
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update medical clearance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWaiverToggle = async () => {
    if (!selectedStudent) return;
    const nextSigned = !selectedStudent.medical_waiver_signed;
    setSubmitting(true);
    setFormError(null);
    try {
      await onUpdateWaiver(selectedStudent.id, nextSigned);
      setSelectedStudent({
        ...selectedStudent,
        medical_waiver_signed: nextSigned ? 1 : 0,
        medical_waiver_date: nextSigned ? new Date().toISOString().slice(0, 10) : undefined,
      });
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update the waiver');
    } finally {
      setSubmitting(false);
    }
  };

  const openStudentRecord = (student: Student) => {
    setFormError(null);
    setSelectedStudent(student);
    setStayForm({
      whatsapp: student.whatsapp ?? '',
      arrival_date: student.arrival_date ?? '',
      departure_date: student.departure_date ?? '',
      needs_accommodation: Boolean(student.needs_accommodation),
      needs_airport_transfer: Boolean(student.needs_airport_transfer),
    });
  };

  const handleStaySave = async () => {
    if (!selectedStudent) return;
    if (stayForm.arrival_date && stayForm.departure_date && stayForm.departure_date < stayForm.arrival_date) {
      setFormError('Check-out date cannot be before the arrival date.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const whatsapp = stayForm.whatsapp.trim();
      await onUpdateStay(selectedStudent.id, {
        whatsapp: whatsapp || null,
        arrival_date: stayForm.arrival_date || null,
        departure_date: stayForm.departure_date || null,
        needs_accommodation: stayForm.needs_accommodation ? 1 : 0,
        needs_airport_transfer: stayForm.needs_airport_transfer ? 1 : 0,
      });
      setSelectedStudent({
        ...selectedStudent,
        whatsapp: whatsapp || undefined,
        arrival_date: stayForm.arrival_date || undefined,
        departure_date: stayForm.departure_date || undefined,
        needs_accommodation: stayForm.needs_accommodation ? 1 : 0,
        needs_airport_transfer: stayForm.needs_airport_transfer ? 1 : 0,
      });
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save the trip details');
    } finally {
      setSubmitting(false);
    }
  };

  if (isRegistrationPageOpen) {
    return (
      <StudentRegistrationPage
        userRole={userRole}
        onRegister={async (studentData) => {
          await onRegisterStudent(studentData);
          await onRefresh();
        }}
        onCancel={() => setIsRegistrationPageOpen(false)}
      />
    );
  }

  const firstRow = filteredStudents.length === 0 ? 0 : pageStart + 1;
  const lastRow = Math.min(pageStart + rowsPerPage, filteredStudents.length);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <aside className="w-full lg:w-64 bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] space-y-5 shrink-0">
          <div>
            <label htmlFor="customer-search" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                id="customer-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email, phone"
                className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#4C8BF5]"
              />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Student status
            </div>
            <div className="space-y-1 text-xs">
              {[{ key: 'all' as const, label: 'All students' }, ...STATUS_ORDER.map((status) => ({ key: status, label: STATUS_META[status].label }))].map((item) => {
                const isSelected = statusFilter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatusFilter(item.key)}
                    aria-pressed={isSelected}
                    className={`w-full text-left rtl:text-right py-1.5 px-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'font-bold text-[#4C8BF5] bg-blue-50/70 dark:bg-blue-950/40'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[11px] text-slate-400">{counts[item.key] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Users className="w-4 h-4 text-[#4C8BF5] mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong className="text-slate-800 dark:text-slate-200">{openInquiries}</strong> open {openInquiries === 1 ? 'inquiry' : 'inquiries'} waiting for a first response or follow-up.
            </span>
          </div>
        </aside>

        <section className="flex-1 w-full space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
            <div>
              <h1 className="text-2xl font-extrabold text-[#28334E] dark:text-white tracking-tight">Customers</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Students, leads and certified divers — {students.length} {students.length === 1 ? 'record' : 'records'} on file.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsRegistrationPageOpen(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/25 cursor-pointer transition-all active:scale-[0.98]"
            >
              <span>REGISTER STUDENT</span>
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right text-xs">
                <thead>
                  <tr className="border-b border-[#E8EEF7] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50 text-[10px] font-bold text-[#4C8BF5] uppercase tracking-wider">
                    <th scope="col" className="py-3.5 px-4 font-bold">Customer</th>
                    <th scope="col" className="py-3.5 px-4 font-bold">Description</th>
                    <th scope="col" className="py-3.5 px-4 font-bold">Start date</th>
                    <th scope="col" className="py-3.5 px-4 font-bold">Arrival → Check-out</th>
                    <th scope="col" className="py-3.5 px-4 font-bold">Accommodation</th>
                    <th scope="col" className="py-3.5 px-4 font-bold">Airport pickup</th>
                    <th scope="col" className="py-3.5 px-4 font-bold">WhatsApp</th>
                    <th scope="col" className="py-3.5 px-4 font-bold">Status</th>
                    <th scope="col" className="py-3.5 px-4 text-right font-bold">Deposit</th>
                    <th scope="col" className="py-3.5 px-4 text-center font-bold">Comment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] dark:divide-slate-800/80">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 px-4 text-center text-slate-500 dark:text-slate-400">
                        {students.length === 0
                          ? 'No students yet. Register the first student to start the customer record.'
                          : 'No students match this filter. Clear the search or choose another status.'}
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((student) => {
                      const meta = STATUS_META[student.status];
                      return (
                        <tr key={student.id} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#28334E] dark:text-white">
                            <button
                              type="button"
                              onClick={() => openStudentRecord(student)}
                              className="text-left rtl:text-right hover:text-[#4C8BF5] transition-colors cursor-pointer"
                            >
                              {student.first_name} {student.last_name}
                            </button>
                            <div className="text-[11px] font-normal text-slate-400 truncate max-w-[190px]">{student.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                            <span
                              className="block max-w-[220px] truncate"
                              title={(student.activities ?? []).map((activity) => activity.title).join(', ')}
                            >
                              {activitySummary(student)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {(() => {
                              const starts = (student.activities ?? [])
                                .map((activity) => activity.start_date)
                                .filter((date): date is string => Boolean(date))
                                .sort();
                              return starts.length > 0 ? (
                                <span className="font-medium text-slate-800 dark:text-slate-200">{formatShortDate(starts[0])}</span>
                              ) : (
                                <span className="text-slate-400">Not set</span>
                              );
                            })()}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {student.arrival_date || student.departure_date ? (
                              <>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{formatShortDate(student.arrival_date)}</span>
                                <span className="text-slate-400"> → </span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">{formatShortDate(student.departure_date)}</span>
                              </>
                            ) : (
                              <span className="text-slate-400">Not set</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                student.needs_accommodation
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {student.needs_accommodation ? 'Yes' : 'No'}
                            </span>
                            {student.needs_accommodation && (student.arrival_date || student.departure_date) && (
                              <div className="mt-1 whitespace-nowrap font-data text-[10px] text-slate-500 dark:text-slate-400">
                                {formatShortDate(student.arrival_date)} → {formatShortDate(student.departure_date)}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                student.needs_airport_transfer
                                  ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {student.needs_airport_transfer ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {student.whatsapp || <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
                              {meta.label}
                            </span>
                          </td>
                          <td className={`py-3.5 px-4 text-right whitespace-nowrap font-data ${student.deposit_paid_eur ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                            {formatEuro(student.deposit_paid_eur)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              aria-label={`Open comment for ${student.first_name} ${student.last_name}`}
                              onClick={() => openStudentRecord(student)}
                              className="w-7 h-7 rounded-full bg-[#EEF4FF] dark:bg-slate-800 text-[#4C8BF5] hover:bg-[#4C8BF5] hover:text-white inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-[#E8EEF7] dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 gap-3">
              <span>
                Showing {firstRow}–{lastRow} of {filteredStudents.length}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  className="px-2.5 py-1 rounded-lg hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &lt; Prev
                </button>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Page {safePage} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage === pageCount}
                  onClick={() => setCurrentPage(Math.min(pageCount, safePage + 1))}
                  className="px-2.5 py-1 rounded-lg hover:text-slate-900 dark:hover:text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next &gt;
                </button>

                <label className="flex items-center gap-2">
                  <span className="sr-only">Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(event) => setRowsPerPage(Number(event.target.value))}
                    className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-[#4C8BF5]"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  per page
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h2>
                <p className="text-xs text-slate-400">
                  {selectedStudent.certification_agency && selectedStudent.certification_agency !== 'None'
                    ? `${selectedStudent.certification_agency} ${selectedStudent.certification_level || ''}`
                    : 'Not certified yet'}{' '}
                  • ID: {selectedStudent.id}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close student record"
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Personal best depth</span>
                  <div className="text-lg font-bold text-[#4C8BF5] mt-1 font-mono">
                    {selectedStudent.total_depth_pb ? `${selectedStudent.total_depth_pb}m` : '—'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Static apnea</span>
                  <div className="text-lg font-bold text-[#4C8BF5] mt-1 font-mono">
                    {selectedStudent.static_apnea_pb || '—'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">Trip &amp; stay</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Arrival and check-out keep transfers, rooms and the activity plan in sync.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label htmlFor="record-whatsapp" className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold mb-1">WhatsApp</label>
                    <input id="record-whatsapp" type="tel" inputMode="tel" maxLength={60} value={stayForm.whatsapp} onChange={(event) => setStayForm({ ...stayForm, whatsapp: event.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label htmlFor="record-arrival" className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold mb-1">Arrival</label>
                    <input id="record-arrival" type="date" value={stayForm.arrival_date} onChange={(event) => setStayForm({ ...stayForm, arrival_date: event.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label htmlFor="record-departure" className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold mb-1">Check-out</label>
                    <input id="record-departure" type="date" min={stayForm.arrival_date || undefined} value={stayForm.departure_date} onChange={(event) => setStayForm({ ...stayForm, departure_date: event.target.value })} className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 text-slate-900 dark:text-white" />
                  </div>
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={stayForm.needs_accommodation} onChange={(event) => setStayForm({ ...stayForm, needs_accommodation: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#4C8BF5]" />
                    Accommodation needed
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <input type="checkbox" checked={stayForm.needs_airport_transfer} onChange={(event) => setStayForm({ ...stayForm, needs_airport_transfer: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#4C8BF5]" />
                    Airport pickup
                  </label>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleStaySave}
                    className="inline-flex items-center rounded-lg bg-[#4C8BF5] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#3B7BE8] disabled:opacity-50 cursor-pointer"
                  >
                    Save trip details
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                <ShieldCheck className={`w-4 h-4 mt-0.5 ${selectedStudent.medical_waiver_signed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} aria-hidden="true" />
                <div className="flex-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Medical waiver {selectedStudent.medical_waiver_signed ? 'signed' : 'pending'}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {selectedStudent.medical_waiver_signed
                      ? `On file${selectedStudent.medical_waiver_date ? ` since ${selectedStudent.medical_waiver_date}` : ''}.`
                      : 'Do not take this student in the water until the waiver is signed.'}
                  </div>
                  {canEditWaiver && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleWaiverToggle}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-[#4C8BF5] hover:text-[#4C8BF5] disabled:opacity-50 cursor-pointer"
                    >
                      {selectedStudent.medical_waiver_signed ? 'Revoke waiver' : 'Mark waiver signed'}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <label htmlFor="medical-clearance-status" className="block text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold mb-1">
                  Medical clearance
                </label>
                {isHealthAuthorized ? (
                  <select
                    id="medical-clearance-status"
                    value={selectedStudent.medical_clearance_status || 'unknown'}
                    disabled={submitting}
                    onChange={(event) => {
                      if (isMedicalClearanceStatus(event.target.value)) {
                        void handleMedicalClearanceChange(event.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2 text-slate-900 dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                  >
                    <option value="unknown">{CLEARANCE_LABEL.unknown}</option>
                    <option value="cleared">{CLEARANCE_LABEL.cleared}</option>
                    <option value="physician_approved">{CLEARANCE_LABEL.physician_approved}</option>
                  </select>
                ) : (
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                    {selectedStudent.medical_clearance_status
                      ? CLEARANCE_LABEL[selectedStudent.medical_clearance_status]
                      : 'Restricted / not available'}
                  </div>
                )}
              </div>
              {formError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{formError}</p>}

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-slate-900 dark:text-white">Activities &amp; payments</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Paid to date: <strong className="font-data text-slate-900 dark:text-white">{formatEuro(selectedStudent.paid_total_eur)}</strong>
                  </div>
                </div>
                {(selectedStudent.activities ?? []).length === 0 ? (
                  <div className="text-slate-500 dark:text-slate-400">No activity booked yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {(selectedStudent.activities ?? []).map((activity, index) => (
                      <li key={`${activity.title}-${index}`} className="flex items-start justify-between gap-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{activity.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {activity.start_date || activity.end_date
                              ? `${formatShortDate(activity.start_date)} → ${formatShortDate(activity.end_date)}`
                              : 'Dates not scheduled'}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-[#EEF4FF] dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#4C8BF5]">
                          {activity.status.replace('_', ' ')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white">Contact &amp; safety</div>
                <div className="text-slate-600 dark:text-slate-300 space-y-1">
                  <div>Email: <strong>{selectedStudent.email}</strong></div>
                  <div>Phone: <strong>{selectedStudent.phone || '—'}</strong></div>
                  <div>WhatsApp: <strong>{selectedStudent.whatsapp || '—'}</strong></div>
                  <div>Emergency contact: <strong>{selectedStudent.emergency_contact_name || 'None'}</strong></div>
                  <div>Emergency phone: <strong>{selectedStudent.emergency_contact_phone || '—'}</strong></div>
                  <div>Insurance: <strong>{selectedStudent.insurance_details || '—'}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl bg-[#4C8BF5] text-white font-medium text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
