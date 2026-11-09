import React, { useState } from 'react';
import { Invoice, Expense, Student, UserRole } from '../types';
import { Language, translations } from '../i18n';
import {
  Receipt,
  DollarSign,
  Plus,
  CreditCard,
  Search,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  X,
  FileText,
} from 'lucide-react';

interface FinanceViewProps {
  invoices: Invoice[];
  expenses: Expense[];
  students: Student[];
  userRole: UserRole;
  onRefresh: () => void;
  onCreateInvoice: (invoiceData: any) => Promise<void>;
  onRecordPayment: (invoiceId: string, paymentData: any) => Promise<void>;
  onCreateExpense: (expenseData: any) => Promise<void>;
  lang: Language;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  invoices,
  expenses,
  students,
  userRole,
  onRefresh,
  onCreateInvoice,
  onRecordPayment,
  onCreateExpense,
  lang,
}) => {
  const t = translations[lang];
  const canAccessFinance = ['owner', 'finance'].includes(userRole);

  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New invoice state
  const [newInvoice, setNewInvoice] = useState({
    student_id: students[0]?.id || '',
    currency: 'EUR',
    tax_rate: 0,
    items: [{ description: 'AIDA 2 Freediver Course Tuition', quantity: 1, unit_price: 320 }],
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: 'Payment required prior to ocean day 1.',
  });

  // Payment state
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    currency: 'EUR',
    payment_method: 'Cash EUR',
    payment_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    notes: '',
  });

  // New expense state
  const [newExpense, setNewExpense] = useState({
    category: 'Oxygen & Safety Gas',
    vendor_name: 'Dahab Medical Gases',
    amount: 3200,
    currency: 'EGP',
    expense_date: new Date().toISOString().slice(0, 10),
    description: 'Medical oxygen cylinders refill for emergency kits',
    receipt_ref: 'REC-' + Math.floor(1000 + Math.random() * 9000),
  });

  if (!canAccessFinance) {
    return (
      <div className="p-8 rounded-2xl bg-[#091728] border border-cyan-900/50 text-center max-w-xl mx-auto space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-rose-950/60 text-rose-400 border border-rose-800 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied: Financial Ledger</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your active role (<strong className="text-cyan-300 uppercase">{userRole.replace('_', ' ')}</strong>) is not authorized to inspect customer billing or financial records. Server-side security blocks all unauthorized requests to this endpoint.
        </p>
        <div className="p-3 rounded-lg bg-[#071322] border border-cyan-950 text-slate-400 text-[11px]">
          ℹ To evaluate this module, use the Role Access Simulator in the top header and switch to <strong>Center Owner</strong> or <strong>Finance Manager</strong>.
        </div>
      </div>
    );
  }

  // Financial aggregates
  const totalInvoicedEur = invoices.reduce((acc, inv) => acc + (inv.currency === 'EUR' ? inv.total_amount : 0), 0);
  const totalCollectedEur = invoices.reduce((acc, inv) => acc + (inv.currency === 'EUR' ? inv.paid_amount : 0), 0);
  const totalOutstandingEur = totalInvoicedEur - totalCollectedEur;
  const totalExpensesEgp = expenses.reduce((acc, exp) => acc + (exp.currency === 'EGP' ? exp.amount : 0), 0);
  const totalExpensesEur = expenses.reduce((acc, exp) => acc + (exp.currency === 'EUR' ? exp.amount : 0), 0);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${inv.first_name} ${inv.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await onCreateInvoice(newInvoice);
      setIsInvoiceModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await onRecordPayment(selectedInvoiceForPayment.id, paymentData);
      setSelectedInvoiceForPayment(null);
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await onCreateExpense(newExpense);
      setIsExpenseModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setSelectedInvoiceForPayment(inv);
    const balance = inv.total_amount - inv.paid_amount;
    setPaymentData({
      amount: balance,
      currency: inv.currency,
      payment_method: 'Cash EUR',
      payment_date: new Date().toISOString().slice(0, 10),
      reference_number: '',
      notes: `Settlement for ${inv.invoice_number}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Finance & Billing Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit-tracked invoices, payments, vendor expenses, and Red Sea operational cashflow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Invoice</span>
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-cyan-200 border border-[#E8EEF7] dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs hover:border-[#4C8BF5]"
          >
            <Plus className="w-4 h-4 text-[#4C8BF5]" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)]">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Invoiced (EUR)</span>
          <div className="text-2xl font-extrabold text-[#28334E] dark:text-white mt-1 font-mono">
            €{totalInvoicedEur.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{invoices.length} invoices generated</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-emerald-100 dark:border-emerald-900/40 shadow-[0_2px_12px_rgba(40,51,78,0.02)]">
          <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Collected Revenue</span>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            €{totalCollectedEur.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Settled via cash, cards & InstaPay</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-amber-100 dark:border-amber-900/40 shadow-[0_2px_12px_rgba(40,51,78,0.02)]">
          <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Outstanding Receivable</span>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 font-mono">
            €{totalOutstandingEur.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Awaiting customer payment</div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-rose-100 dark:border-rose-900/40 shadow-[0_2px_12px_rgba(40,51,78,0.02)]">
          <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">Center Expenses</span>
          <div className="text-xl font-extrabold text-[#28334E] dark:text-white mt-1 font-mono">
            {totalExpensesEgp.toLocaleString()} EGP <span className="text-xs text-slate-400 font-normal">/ €{totalExpensesEur}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Protectorate fees, O2, maintenance</div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E8EEF7] dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'invoices'
              ? 'bg-[#4C8BF5] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4C8BF5] border border-[#E8EEF7] dark:border-slate-700'
          }`}
        >
          Customer Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-[#4C8BF5] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4C8BF5] border border-[#E8EEF7] dark:border-slate-700'
          }`}
        >
          Center Expenses & Supplier Bills ({expenses.length})
        </button>
      </div>

      {/* INVOICES TABLE */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0a182a] p-3 rounded-xl border border-cyan-900/40">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by invoice number or student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#071322] border border-cyan-900/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#071322] border border-cyan-900/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="paid">Paid in Full</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="issued">Issued / Unpaid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="bg-[#0a182a] border border-cyan-900/40 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#071424] text-cyan-400/90 font-semibold border-b border-cyan-900/50 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Paid / Balance</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-900/30">
                  {filteredInvoices.map((inv) => {
                    const balance = inv.total_amount - inv.paid_amount;
                    return (
                      <tr key={inv.id} className="hover:bg-[#0e213b]/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {inv.first_name} {inv.last_name}
                          </div>
                          <div className="text-[11px] text-slate-400">{inv.student_email}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          <div>Issued: {inv.issue_date}</div>
                          <div className="text-[10px]">Due: {inv.due_date}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {inv.currency} {inv.total_amount}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="text-emerald-400">Paid: {inv.currency} {inv.paid_amount}</div>
                          {balance > 0 && (
                            <div className="text-amber-400 text-[10px]">Due: {inv.currency} {balance}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.status === 'paid'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : inv.status === 'partially_paid'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {inv.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {balance > 0 ? (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition-colors"
                            >
                              + Record Payment
                            </button>
                          ) : (
                            <span className="text-emerald-400 text-xs font-semibold flex items-center justify-end gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Settled</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSES TABLE */}
      {activeTab === 'expenses' && (
        <div className="bg-[#0a182a] border border-cyan-900/40 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#071424] text-cyan-400/90 font-semibold border-b border-cyan-900/50 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Expense #</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Receipt Ref</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-900/30">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#0e213b]/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {exp.expense_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-cyan-300">
                      {exp.category}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-medium">{exp.vendor_name}</div>
                      <div className="text-[11px] text-slate-400 italic">{exp.description}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {exp.currency} {exp.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {exp.expense_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {exp.receipt_ref || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {exp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091728] border border-cyan-800/60 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-cyan-900/50 flex items-center justify-between bg-[#071322]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Record Customer Payment</span>
              </h3>
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="p-3 rounded-lg bg-[#071322] border border-cyan-950 text-slate-300">
                <div className="flex justify-between">
                  <span>Invoice: <strong>{selectedInvoiceForPayment.invoice_number}</strong></span>
                  <span>Student: <strong>{selectedInvoiceForPayment.first_name} {selectedInvoiceForPayment.last_name}</strong></span>
                </div>
                <div className="mt-1 text-slate-400">
                  Total: {selectedInvoiceForPayment.currency} {selectedInvoiceForPayment.total_amount} • Remaining: <strong>{selectedInvoiceForPayment.currency} {selectedInvoiceForPayment.total_amount - selectedInvoiceForPayment.paid_amount}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Payment Method *</label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Cash EUR">Cash (EUR)</option>
                    <option value="Cash EGP">Cash (Egyptian Pound)</option>
                    <option value="Credit Card">Credit Card Terminal</option>
                    <option value="Bank Transfer">International Wire / SEPA</option>
                    <option value="InstaPay Egypt">InstaPay Egypt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Transaction / Reference #</label>
                <input
                  type="text"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                  placeholder="e.g. CC-STR-941824 or Cash Receipt #"
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Ledger Notes</label>
                <input
                  type="text"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/50">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPayment(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-md"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091728] border border-cyan-800/60 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-cyan-900/50 flex items-center justify-between bg-[#071322]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Issue Customer Invoice</span>
              </h3>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Student / Client *</label>
                <select
                  required
                  value={newInvoice.student_id}
                  onChange={(e) => setNewInvoice({ ...newInvoice, student_id: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Currency</label>
                  <select
                    value={newInvoice.currency}
                    onChange={(e) => setNewInvoice({ ...newInvoice, currency: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="EGP">EGP (Egyptian Pound)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Line item */}
              <div className="p-3 rounded-xl bg-[#0c1f36] border border-cyan-900/40 space-y-3">
                <h4 className="text-slate-300 font-semibold text-xs">Line Item Details</h4>
                <div>
                  <label className="block text-slate-400 mb-1">Description</label>
                  <input
                    type="text"
                    required
                    value={newInvoice.items[0]?.description}
                    onChange={(e) => {
                      const items = [...newInvoice.items];
                      items[0].description = e.target.value;
                      setNewInvoice({ ...newInvoice, items });
                    }}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={newInvoice.items[0]?.quantity}
                      onChange={(e) => {
                        const items = [...newInvoice.items];
                        items[0].quantity = Number(e.target.value);
                        setNewInvoice({ ...newInvoice, items });
                      }}
                      className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Unit Price ({newInvoice.currency})</label>
                    <input
                      type="number"
                      value={newInvoice.items[0]?.unit_price}
                      onChange={(e) => {
                        const items = [...newInvoice.items];
                        items[0].unit_price = Number(e.target.value);
                        setNewInvoice({ ...newInvoice, items });
                      }}
                      className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notes / Terms</label>
                <input
                  type="text"
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/50">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-md"
                >
                  {submitting ? 'Generating...' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091728] border border-cyan-800/60 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-cyan-900/50 flex items-center justify-between bg-[#071322]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                <span>Record Operational Expense</span>
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Expense Category *</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Boat Charter & Captain">Boat Charter & Captain</option>
                    <option value="Dive Site Entry Fees">Dive Site Entry Fees (Protectorate)</option>
                    <option value="Equipment Maintenance">Equipment Maintenance</option>
                    <option value="Facility Rent & Utilities">Facility Rent & Utilities</option>
                    <option value="Oxygen & Safety Gas">Oxygen & Safety Gas</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Staff Welfare">Staff Welfare</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Vendor / Payee *</label>
                  <input
                    type="text"
                    required
                    value={newExpense.vendor_name}
                    onChange={(e) => setNewExpense({ ...newExpense, vendor_name: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Currency</label>
                  <select
                    value={newExpense.currency}
                    onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="EGP">EGP (Egyptian Pound)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Bill Memo *</label>
                <input
                  type="text"
                  required
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Receipt Reference #</label>
                  <input
                    type="text"
                    value={newExpense.receipt_ref}
                    onChange={(e) => setNewExpense({ ...newExpense, receipt_ref: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/50">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#071322] font-semibold cursor-pointer shadow-md"
                >
                  {submitting ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
