import React, { useEffect, useRef, useState } from 'react';
import {
  CustomerRequest,
  CustomerRequestInput,
  Expense,
  FinanceAccountBalance,
  FinanceAccountMovement,
  Invoice,
  InvoiceUpdateInput,
  Payment,
  PaymentInput,
  Student,
  UserRole,
} from '../types';
import { Language, translations } from '../i18n';
import { apiRequest } from '../api';
import { downloadCsv } from '../utils/csv';
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
  Download,
} from 'lucide-react';
import { InvoiceBillDialog } from './InvoiceBillDialog';

type RequestCategory = Exclude<CustomerRequestInput['items'][number]['category'], 'gear_rental'>;

interface RequestCatalogItem {
  description: string;
  price: number;
  unit?: string;
}

interface RequestDraftItem {
  category: RequestCategory;
  description: string;
  quantity: number;
  unit_price: number;
  beneficiary_student_id: string;
  check_in_date?: string;
  check_out_date?: string;
}

const localDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const stayNights = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return 0;
  const nights = Math.round((Date.parse(`${checkOut}T00:00:00.000Z`) - Date.parse(`${checkIn}T00:00:00.000Z`)) / 86_400_000);
  return Number.isFinite(nights) ? nights : 0;
};

interface AdjustmentAllocationDraft {
  payment_allocation_id?: string;
  item_id?: string;
  beneficiary_student_id?: string;
  amount: number;
}

interface FinanceCategories {
  expense: string[];
  billing: string[];
  income: string[];
}

type PaymentCurrency = 'EUR' | 'EGP' | 'USD' | 'GBP';

interface FinanceFxRates {
  rates_to_eur: Record<PaymentCurrency, number | null>;
  updated_at: string | null;
  updated_by_name: string | null;
}

interface FinanceHistoryRow {
  id: string;
  date: string;
  type: string;
  customerId?: string;
  customer: string;
  supplier: string;
  invoice: string;
  invoiceId?: string;
  service: string;
  category: string;
  currency: string;
  amount: number;
  method: string;
  account: string;
  staff: string;
  status: string;
}

const requestCatalog: Record<RequestCategory, RequestCatalogItem[]> = {
  course: [
    { description: 'SSI Basic Freediver', price: 150 },
    { description: 'SSI Freediver', price: 310 },
    { description: 'SSI Advanced Freediver', price: 360 },
    { description: 'SSI Performance Freediver', price: 480 },
  ],
  package: [
    { description: 'Combo Week — Beginner + Advanced, diving only', price: 690 },
    { description: 'Combo Week — Beginner + Advanced, 10 nights low season', price: 870 },
    { description: 'Combo Week — Beginner + Advanced, 10 nights high season', price: 920 },
    { description: 'Beginner Week — diving only', price: 450 },
    { description: 'Beginner Week — 8 nights, low season', price: 595 },
    { description: 'Beginner Week — 8 nights, high season', price: 635 },
    { description: 'Training Week — diving only', price: 300 },
    { description: 'Training Week — 8 nights, low season', price: 445 },
    { description: 'Training Week — 8 nights, high season', price: 485 },
    { description: 'Underwater Photography Week', price: 580 },
    { description: 'Equalisation Intensive', price: 380 },
    { description: 'Instructor Pathway', price: 2945 },
    { description: 'Master Program — confirm option in special notes', price: 0 },
  ],
  accommodation: [
    { description: 'Lighthouse Room', price: 0, unit: 'night' },
    { description: 'Blue Hole Room', price: 0, unit: 'night' },
    { description: 'Eal Garden Room', price: 0, unit: 'night' },
    { description: 'Islands Room', price: 0, unit: 'night' },
  ],
  activity: [
    { description: 'Blue Hole guided fun dive', price: 0 },
    { description: 'Ras Mohamed dive trip', price: 0 },
  ],
  workshop: [
    { description: 'Equalisation workshop', price: 0 },
    { description: 'Breathing workshop', price: 0 },
  ],
  training: [
    { description: 'Group training session', price: 0, unit: 'session' },
    { description: 'Private training session', price: 0, unit: 'session' },
    { description: 'Training Techniques', price: 160, unit: 'session' },
    { description: 'Monofin class', price: 125, unit: 'session' },
  ],
  shop: [
    { description: 'Freedive Dahab Nose Clip', price: 0 },
    { description: 'Freedive Dahab T-shirt', price: 0 },
    { description: 'Freedive Dahab Poncho', price: 0 },
  ],
  other: [{ description: 'Other customer request', price: 0 }],
};

interface FinanceViewProps {
  initialTab?: 'requests' | 'income' | 'expenses' | 'invoices' | 'history' | 'movements';
  invoices: Invoice[];
  customerRequests: CustomerRequest[];
  expenses: Expense[];
  students: Student[];
  userRole: UserRole;
  onRefresh: () => void;
  onCreateInvoice: (invoiceData: any) => Promise<void>;
  onUpdateInvoice: (invoiceId: string, changes: InvoiceUpdateInput) => Promise<void>;
  onRecordPayment: (invoiceId: string, paymentData: PaymentInput) => Promise<void>;
  onCreateExpense: (expenseData: any) => Promise<void>;
  onCreateCustomerRequest: (data: CustomerRequestInput) => Promise<void>;
  onRecordCustomerRequestPayment: (requestId: string, paymentData: PaymentInput) => Promise<void>;
  lang: Language;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  initialTab,
  invoices,
  customerRequests,
  expenses,
  students,
  userRole,
  onRefresh,
  onCreateInvoice,
  onUpdateInvoice,
  onRecordPayment,
  onCreateExpense,
  onCreateCustomerRequest,
  onRecordCustomerRequestPayment,
  lang,
}) => {
  const t = translations[lang];
  const canAccessFinance = ['owner', 'finance'].includes(userRole);
  const canAccessCustomerRequests = canAccessFinance || userRole === 'front_desk_crm';
  const frontDeskOnly = userRole === 'front_desk_crm';

  const [activeTab, setActiveTab] = useState<'requests' | 'income' | 'expenses' | 'invoices' | 'history' | 'movements'>(
    frontDeskOnly ? 'requests' : initialTab || 'income',
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [financeCategories, setFinanceCategories] = useState<FinanceCategories>({
    expense: ['Taxi driving', 'Safe-cash-safe', 'Laundry', 'Room cleaning', 'Blue folder', 'Exchange', 'Internet/phone', 'Taxi shopping', 'DC maintenance/renewal', 'EQ maintenance/renewal', 'Water tank', 'Water bottles', 'Water card', 'Airport taxi', 'Electricity', 'Desert dinner excursion', 'Ras Mohammed excursion', 'Cleaning supplies', 'Stationery', 'Salary', 'SSI kits', 'Company documents/legal fees', 'Other'],
    billing: ['Bill customer', 'course', 'package', 'accommodation', 'activity', 'workshop', 'training', 'gear_rental', 'shop', 'other'],
    income: ['FDD Income Receipt'],
  });
  const [categoryDraft, setCategoryDraft] = useState('');
  const [accountMovements, setAccountMovements] = useState<FinanceAccountMovement[]>([]);
  const [accountBalances, setAccountBalances] = useState<FinanceAccountBalance[]>([]);
  const [fxRates, setFxRates] = useState<FinanceFxRates>({
    rates_to_eur: { EUR: 1, EGP: null, USD: null, GBP: null },
    updated_at: null,
    updated_by_name: null,
  });
  const [fxRateDraft, setFxRateDraft] = useState<Record<PaymentCurrency, string>>({
    EUR: '1',
    EGP: '',
    USD: '',
    GBP: '',
  });
  const [fxSaving, setFxSaving] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);
  const [openingBalanceDraft, setOpeningBalanceDraft] = useState<Array<{ account: string; currency: string; amount: number }>>([]);
  const [historyFilters, setHistoryFilters] = useState({
    from_date: '',
    to_date: '',
    search: '',
    customer_id: '',
    service: '',
    currency: '',
    method: '',
    account: '',
    staff: '',
    status: '',
    category: '',
    supplier: '',
  });
  const [categoryType, setCategoryType] = useState<'expense' | 'billing' | 'income'>('expense');
  const [adjustmentTarget, setAdjustmentTarget] = useState<{ payment: Payment; invoice: Invoice } | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    adjustment_type: 'refund',
    direction: 'debit',
    adjustment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'Cash EUR',
    payment_account: 'Cash EUR',
    reason: '',
    reference_number: '',
  });
  const [adjustmentAllocations, setAdjustmentAllocations] = useState<AdjustmentAllocationDraft[]>([]);
  const [movementForm, setMovementForm] = useState({
    movement_type: 'transfer',
    from_account: '',
    from_currency: 'EUR',
    from_amount: 0,
    to_account: '',
    to_currency: 'EUR',
    to_amount: 0,
    movement_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    notes: '',
  });

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<{ invoice: Invoice; requestId?: string } | null>(null);
  const requestDialogRef = useRef<HTMLDivElement>(null);
  const requestButtonRef = useRef<HTMLButtonElement>(null);
  const paymentDialogRef = useRef<HTMLDivElement>(null);
  const paymentReturnFocusRef = useRef<HTMLElement | null>(null);
  const adjustmentDialogRef = useRef<HTMLDialogElement>(null);
  const adjustmentReturnFocusRef = useRef<HTMLElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New invoice state
  const [newInvoice, setNewInvoice] = useState({
    student_id: students[0]?.id || '',
    currency: 'EUR',
    tax_rate: 0,
    items: [{
      category: 'course' as NonNullable<Invoice['items']>[number]['category'],
      description: 'SSI Freediver Course Tuition',
      quantity: 1,
      unit_price: 310,
      check_in_date: '',
      check_out_date: '',
    }],
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: 'Payment required prior to ocean day 1.',
  });

  // Payment state
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    currency: 'EUR',
    customer_id: '',
    payment_method: 'Cash EUR',
    payment_account: 'Cash EUR',
    payment_date: new Date().toISOString().slice(0, 10),
    reference_number: '',
    notes: '',
  });

  const [newCustomerRequest, setNewCustomerRequest] = useState({
    student_id: students[0]?.id || '',
    currency: 'EUR',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    special_request: '',
    initial_payment: {
      amount: 0,
      payment_method: 'Cash EUR',
      payment_account: 'Cash EUR',
      payment_date: new Date().toISOString().slice(0, 10),
      reference_number: '',
      notes: '',
    },
  });
  const [requestItems, setRequestItems] = useState<RequestDraftItem[]>([
    { category: 'course', description: 'SSI Freediver', quantity: 1, unit_price: 310, beneficiary_student_id: '' },
  ]);

  // New expense state
  const [newExpense, setNewExpense] = useState({
    category: 'Taxi driving',
    vendor_name: 'Dahab Medical Gases',
    amount: 3200,
    currency: 'EGP',
    payment_method: 'Cash EGP',
    payment_account: 'Cash EGP',
    expense_date: new Date().toISOString().slice(0, 10),
    description: 'Medical oxygen cylinders refill for emergency kits',
    receipt_ref: 'REC-' + Math.floor(1000 + Math.random() * 9000),
  });

  useEffect(() => {
    if (frontDeskOnly) setActiveTab('requests');
  }, [frontDeskOnly]);

  useEffect(() => {
    if (!newCustomerRequest.student_id && students[0]) {
      setNewCustomerRequest((current) => ({ ...current, student_id: students[0].id }));
    }
  }, [newCustomerRequest.student_id, students]);

  useEffect(() => {
    if (!canAccessFinance) return;
    Promise.all([
      apiRequest<FinanceCategories>('/api/finance/categories'),
      apiRequest<FinanceAccountMovement[]>('/api/finance/account-movements'),
      apiRequest<FinanceAccountBalance[]>('/api/finance/account-balances'),
      apiRequest<FinanceFxRates>('/api/finance/fx-rates'),
    ]).then(([categories, movements, balances, rates]) => {
      setFinanceCategories(categories);
      setAccountMovements(movements);
      setAccountBalances(balances);
      setFxRates(rates);
      setFxRateDraft({
        EUR: '1',
        EGP: rates.rates_to_eur.EGP === null ? '' : String(rates.rates_to_eur.EGP),
        USD: rates.rates_to_eur.USD === null ? '' : String(rates.rates_to_eur.USD),
        GBP: rates.rates_to_eur.GBP === null ? '' : String(rates.rates_to_eur.GBP),
      });
      setOpeningBalanceDraft(balances.map(({ account, currency, opening_balance }) => ({
        account, currency, amount: opening_balance,
      })));
    }).catch((error: unknown) => {
      setFormError(error instanceof Error ? error.message : 'Finance settings could not be loaded');
    });
  }, [canAccessFinance]);

  useEffect(() => {
    if (financeCategories.expense.length && !financeCategories.expense.includes(newExpense.category)) {
      setNewExpense((current) => ({ ...current, category: financeCategories.expense[0] }));
    }
  }, [financeCategories.expense, newExpense.category]);

  useEffect(() => {
    if (!isRequestModalOpen) return;
    const dialog = requestDialogRef.current;
    if (!dialog) return;
    const getFocusable = () => dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    getFocusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsRequestModalOpen(false);
        requestButtonRef.current?.focus();
      } else if (event.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [isRequestModalOpen]);

  useEffect(() => {
    if (!selectedInvoiceForPayment) return;
    const dialog = paymentDialogRef.current;
    if (!dialog) return;
    const getFocusable = () => dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    getFocusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedInvoiceForPayment(null);
        setPaymentRequestId(null);
      } else if (event.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      const returnTarget = paymentReturnFocusRef.current;
      paymentReturnFocusRef.current = null;
      window.requestAnimationFrame(() => {
        if (returnTarget?.isConnected) returnTarget.focus();
        else document.getElementById(`${activeTab === 'requests' ? 'finance-requests' : `finance-${activeTab}`}-tab`)?.focus();
      });
    };
  }, [activeTab, selectedInvoiceForPayment]);

  useEffect(() => {
    if (!adjustmentTarget) return;
    const dialog = adjustmentDialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const getFocusable = () => dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    );
    getFocusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setAdjustmentTarget(null);
      } else if (event.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      if (dialog.open) dialog.close();
      const returnTarget = adjustmentReturnFocusRef.current;
      adjustmentReturnFocusRef.current = null;
      window.requestAnimationFrame(() => {
        if (returnTarget?.isConnected) returnTarget.focus();
      });
    };
  }, [adjustmentTarget]);

  if (!canAccessCustomerRequests) {
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

  const dailyIncome = invoices.flatMap((invoice) =>
    (invoice.payments || [])
      .filter((payment) => payment.payment_date === selectedDate)
      .map((payment) => ({ ...payment, invoice })),
  );
  const dailyExpenses = expenses.filter((expense) => expense.expense_date === selectedDate);
  const dailyIncomeTotals = dailyIncome.reduce<Record<string, number>>((totals, payment) => {
    totals[payment.currency] = (totals[payment.currency] || 0) + payment.amount;
    return totals;
  }, {});
  const dailyExpenseTotals = dailyExpenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.currency] = (totals[expense.currency] || 0) + expense.amount;
    return totals;
  }, {});

  const incomeByCategory = (() => {
    const totals = new Map<string, number>();
    invoices
      .filter((invoice) => invoice.status !== 'cancelled' && invoice.currency === 'EUR')
      .forEach((invoice) =>
        (invoice.items || []).forEach((item) => {
          const key = item.category || 'other';
          totals.set(key, (totals.get(key) || 0) + item.total_price);
        }),
      );
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const expensesByCategory = (() => {
    const totals = new Map<string, number>();
    expenses
      .filter((expense) => expense.status !== 'rejected')
      .forEach((expense) => {
        const rate = (fxRates.rates_to_eur as Record<string, number | null>)[expense.currency] ?? 0;
        totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount * rate);
      });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  })();
  const formatCategoryLabel = (category: string) =>
    category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  const exportInvoicesCsv = () => {
    downloadCsv('invoices.csv', [
      ['Invoice', 'Order', 'Customer', 'Email', 'Issued', 'Due', 'Currency', 'Total', 'Paid', 'Balance', 'Status'],
      ...filteredInvoices.map((invoice) => {
        const balance = Math.max(0, invoice.total_amount - invoice.paid_amount);
        return [
          invoice.invoice_number,
          invoice.customer_request_number || '',
          `${invoice.first_name} ${invoice.last_name}`,
          invoice.student_email || '',
          invoice.issue_date,
          invoice.due_date,
          invoice.currency,
          invoice.total_amount,
          invoice.paid_amount,
          balance,
          invoice.status,
        ];
      }),
    ]);
  };
  const exportDailyIncomeCsv = () => {
    downloadCsv(`income-${selectedDate}.csv`, [
      ['Date', 'Customer', 'Invoice', 'Method', 'Currency', 'Amount', 'EUR amount', 'Reference'],
      ...dailyIncome.map((payment) => [
        payment.payment_date,
        `${payment.invoice.first_name} ${payment.invoice.last_name}`,
        payment.invoice.invoice_number,
        payment.payment_method,
        payment.currency,
        payment.amount,
        payment.eur_amount_cents != null ? payment.eur_amount_cents / 100 : '',
        payment.reference_number || '',
      ]),
    ]);
  };
  const exportRequestsCsv = () => {
    downloadCsv('customer-requests.csv', [
      ['Request', 'Invoice', 'Customer', 'Email', 'Issued', 'Currency', 'Total', 'Paid', 'Balance', 'Status'],
      ...customerRequests.map((request) => [
        request.request_number,
        request.invoice_number,
        `${request.first_name} ${request.last_name}`,
        request.student_email || '',
        request.issue_date,
        request.currency,
        request.total_amount,
        request.paid_amount,
        Math.max(0, request.total_amount - request.paid_amount),
        request.status,
      ]),
    ]);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${inv.first_name} ${inv.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const financeHistoryRows: FinanceHistoryRow[] = [
    ...invoices.flatMap((invoice) => {
      const customer = `${invoice.first_name || ''} ${invoice.last_name || ''}`.trim();
      const charges: FinanceHistoryRow[] = (invoice.items || []).map((item) => ({
        id: `charge:${invoice.id}:${item.id}`,
        date: invoice.issue_date,
        type: 'Customer charge',
        customerId: invoice.student_id,
        customer,
        supplier: '',
        invoice: invoice.invoice_number,
        invoiceId: invoice.id,
        service: item.description,
        category: item.category || 'other',
        currency: invoice.currency,
        amount: Math.round(item.total_price * 100) / 100,
        method: '',
        account: '',
        staff: '',
        status: invoice.status,
      }));
      const payments: FinanceHistoryRow[] = (invoice.payments || []).flatMap((payment) => {
        const allocations = payment.allocations?.length ? payment.allocations : [undefined];
        return allocations.map((allocation, index) => ({
          id: `payment:${payment.id}:${allocation?.id || index}`,
          date: payment.payment_date,
          type: 'Customer payment',
          customerId: invoice.student_id,
          customer,
          supplier: '',
          invoice: invoice.invoice_number,
          invoiceId: invoice.id,
          service: allocation?.service_label || invoice.invoice_number,
          category: allocation?.service_category || 'payment',
          currency: payment.currency,
          amount: -((allocation?.amount_cents ?? Math.round(payment.amount * 100)) / 100),
          method: payment.payment_method,
          account: payment.payment_account || '',
          staff: payment.recorded_by_name || '',
          status: 'posted',
        }));
      });
      const adjustments: FinanceHistoryRow[] = (invoice.payments || []).flatMap((payment) =>
        (payment.adjustments || []).flatMap((adjustment) => {
          const allocations = adjustment.allocations?.length ? adjustment.allocations : [undefined];
          return allocations.map((allocation, index) => ({
            id: `adjustment:${adjustment.id}:${index}`,
            date: adjustment.adjustment_date,
            type: `${adjustment.adjustment_type} · ${adjustment.direction}`,
            customerId: invoice.student_id,
            customer,
            supplier: '',
            invoice: invoice.invoice_number,
            invoiceId: invoice.id,
            service: allocation?.service_label || invoice.invoice_number,
            category: allocation?.service_category || 'adjustment',
            currency: payment.currency,
            amount: (adjustment.direction === 'debit' ? 1 : -1) * (allocation?.amount_cents ?? adjustment.amount_cents) / 100,
            method: adjustment.payment_method,
            account: adjustment.payment_account,
            staff: adjustment.recorded_by_name || '',
            status: adjustment.reason,
          }));
        }),
      );
      return [...charges, ...payments, ...adjustments];
    }),
    ...expenses.map((expense): FinanceHistoryRow => ({
      id: `expense:${expense.id}`,
      date: expense.expense_date,
      type: 'Supplier expense',
      customer: '',
      supplier: expense.vendor_name,
      invoice: expense.expense_number,
      service: expense.description,
      category: expense.category,
      currency: expense.currency,
      amount: -expense.amount,
      method: expense.payment_method || '',
      account: expense.payment_account || '',
      staff: expense.created_by_name || '',
      status: expense.status,
    })),
    ...accountMovements.map((movement): FinanceHistoryRow => ({
      id: `movement:${movement.id}`,
      date: movement.movement_date,
      type: movement.movement_type === 'transfer' ? 'Account transfer' : 'Currency exchange',
      customer: '',
      supplier: '',
      invoice: movement.reference_number || movement.id,
      service: `${movement.from_currency} ${movement.from_amount_cents / 100} ${movement.from_account} → ${movement.to_currency} ${movement.to_amount_cents / 100} ${movement.to_account}`,
      category: movement.movement_type,
      currency: movement.from_currency,
      amount: -(movement.from_amount_cents / 100),
      method: movement.movement_type,
      account: movement.from_account,
      staff: movement.recorded_by_name || '',
      status: 'balance only · excluded from income/expenses',
    })),
  ];

  const filteredHistoryRows = financeHistoryRows
    .filter((row) => (!historyFilters.from_date || row.date >= historyFilters.from_date))
    .filter((row) => (!historyFilters.to_date || row.date <= historyFilters.to_date))
    .filter((row) => (!historyFilters.customer_id || row.customerId === historyFilters.customer_id))
    .filter((row) => (!historyFilters.currency || row.currency === historyFilters.currency))
    .filter((row) => (!historyFilters.method || row.method.toLowerCase().includes(historyFilters.method.toLowerCase())))
    .filter((row) => (!historyFilters.account || row.account.toLowerCase().includes(historyFilters.account.toLowerCase())))
    .filter((row) => (!historyFilters.staff || row.staff.toLowerCase().includes(historyFilters.staff.toLowerCase())))
    .filter((row) => (!historyFilters.status || row.status.toLowerCase().includes(historyFilters.status.toLowerCase())))
    .filter((row) => (!historyFilters.category || row.category.toLowerCase().includes(historyFilters.category.toLowerCase())))
    .filter((row) => (!historyFilters.service || row.service.toLowerCase().includes(historyFilters.service.toLowerCase())))
    .filter((row) => (!historyFilters.supplier || row.supplier.toLowerCase().includes(historyFilters.supplier.toLowerCase())))
    .filter((row) => {
      const query = historyFilters.search.trim().toLowerCase();
      return !query || [
        row.customer, row.supplier, row.invoice, row.service, row.category, row.type, row.method, row.account, row.staff,
      ].some((value) => value.toLowerCase().includes(query));
    })
    .sort((left, right) => right.date.localeCompare(left.date));

  const handleInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (newInvoice.items.some((item) => item.category === 'accommodation' && stayNights(item.check_in_date, item.check_out_date) <= 0)) {
      setFormError('Enter valid accommodation check-in and check-out dates, with check-out after check-in.');
      return;
    }
    setSubmitting(true);
    try {
      await onCreateInvoice({
        ...newInvoice,
        items: newInvoice.items.map(({ check_in_date, check_out_date, ...item }) => (
          item.category === 'accommodation'
            ? { ...item, check_in_date, check_out_date }
            : item
        )),
      });
      setIsInvoiceModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshFinanceSettings = async () => {
    const [categories, movements, balances] = await Promise.all([
      apiRequest<FinanceCategories>('/api/finance/categories'),
      apiRequest<FinanceAccountMovement[]>('/api/finance/account-movements'),
      apiRequest<FinanceAccountBalance[]>('/api/finance/account-balances'),
    ]);
    setFinanceCategories(categories);
    setAccountMovements(movements);
    setAccountBalances(balances);
    setOpeningBalanceDraft(balances.map(({ account, currency, opening_balance }) => ({
      account, currency, amount: opening_balance,
    })));
  };

  const handleSaveCategories = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      const saved = await apiRequest<FinanceCategories>('/api/finance/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(financeCategories),
      });
      setFinanceCategories(saved);
      setCategoryDraft('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Finance categories could not be saved');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFxRates = async (event: React.FormEvent) => {
    event.preventDefault();
    const rates_to_eur = {
      EUR: 1,
      EGP: fxRateDraft.EGP.trim() ? Number(fxRateDraft.EGP) : null,
      USD: fxRateDraft.USD.trim() ? Number(fxRateDraft.USD) : null,
      GBP: fxRateDraft.GBP.trim() ? Number(fxRateDraft.GBP) : null,
    };
    if (Object.entries(rates_to_eur).some(([currency, rate]) =>
      currency !== 'EUR' && rate !== null && (!Number.isFinite(rate) || rate <= 0 || rate > 1000),
    )) {
      setFxError('Each EUR conversion rate must be a positive number or left blank.');
      return;
    }
    setFxError(null);
    setFxSaving(true);
    try {
      const saved = await apiRequest<FinanceFxRates>('/api/finance/fx-rates', {
        method: 'PUT',
        body: JSON.stringify({ rates_to_eur }),
      });
      setFxRates(saved);
      setFxRateDraft({
        EUR: '1',
        EGP: saved.rates_to_eur.EGP === null ? '' : String(saved.rates_to_eur.EGP),
        USD: saved.rates_to_eur.USD === null ? '' : String(saved.rates_to_eur.USD),
        GBP: saved.rates_to_eur.GBP === null ? '' : String(saved.rates_to_eur.GBP),
      });
    } catch (error) {
      setFxError(error instanceof Error ? error.message : 'EUR conversion rates could not be saved');
    } finally {
      setFxSaving(false);
    }
  };

  const handleSaveOpeningBalances = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/finance/account-balances/opening', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opening_balances: openingBalanceDraft }),
      });
      await refreshFinanceSettings();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Opening balances could not be saved');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMovementSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/finance/account-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movementForm),
      });
      setMovementForm((current) => ({ ...current, from_amount: 0, to_amount: 0, reference_number: '', notes: '' }));
      await refreshFinanceSettings();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Account movement could not be recorded');
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustmentForm = (payment: Payment, invoice: Invoice) => {
    adjustmentReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFormError(null);
    setAdjustmentTarget({ payment, invoice });
    setAdjustmentData({
      adjustment_type: 'refund',
      direction: 'debit',
      adjustment_date: new Date().toISOString().slice(0, 10),
      payment_method: payment.payment_method,
      payment_account: payment.payment_account || payment.payment_method,
      reason: '',
      reference_number: '',
    });
    const originalAllocations = payment.allocations || [];
    setAdjustmentAllocations(originalAllocations.length ? originalAllocations.map((allocation) => {
      const alreadyDebited = (payment.adjustments || [])
        .filter((adjustment) => adjustment.direction === 'debit')
        .flatMap((adjustment) => adjustment.allocations || [])
        .filter((adjustmentAllocation) => adjustmentAllocation.payment_allocation_id === allocation.id)
        .reduce((sum, adjustmentAllocation) => sum + adjustmentAllocation.amount_cents, 0);
      return {
        payment_allocation_id: allocation.id,
        amount: Math.max(0, allocation.amount_cents - alreadyDebited) / 100,
      };
    }) : [{
      item_id: invoice.items?.[0]?.id || '',
      beneficiary_student_id: invoice.student_id,
      amount: Math.max(0, payment.amount - (payment.adjustments || [])
        .filter((adjustment) => adjustment.direction === 'debit')
        .reduce((sum, adjustment) => sum + adjustment.amount_cents / 100, 0)),
    }]);
  };

  const handleAdjustmentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustmentTarget) return;
    const allocations = adjustmentAllocations.filter((allocation) => allocation.amount > 0);
    const amountCents = allocations.reduce((sum, allocation) => sum + Math.round(allocation.amount * 100), 0);
    if (amountCents <= 0) {
      setFormError('Allocate the adjustment to at least one original payment service.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest(`/api/finance/payments/${adjustmentTarget.payment.id}/adjustments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...adjustmentData, amount: amountCents / 100, allocations }),
      });
      setAdjustmentTarget(null);
      await onRefresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Payment adjustment could not be recorded');
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
      if (paymentRequestId) {
        await onRecordCustomerRequestPayment(paymentRequestId, paymentData);
      } else {
        await onRecordPayment(selectedInvoiceForPayment.id, paymentData);
      }
      setSelectedInvoiceForPayment(null);
      setPaymentRequestId(null);
      await onRefresh();
      await refreshFinanceSettings();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const requestTotal = requestItems.reduce((total, item) => total + item.quantity * item.unit_price, 0);

  const handleCustomerRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newCustomerRequest.student_id || requestItems.length === 0 || requestItems.some((item) => item.unit_price <= 0)) {
      setFormError('Choose a customer and enter a confirmed price for every request item.');
      return;
    }
    if (requestItems.some((item) => item.category === 'accommodation' && stayNights(item.check_in_date, item.check_out_date) <= 0)) {
      setFormError('Enter valid accommodation check-in and check-out dates, with check-out after check-in.');
      return;
    }
    if (newCustomerRequest.initial_payment.amount <= 0 || newCustomerRequest.initial_payment.amount > requestTotal) {
      setFormError(`The deposit must be more than zero and no more than the total bill (${newCustomerRequest.currency} ${requestTotal}).`);
      return;
    }

    setSubmitting(true);
    try {
      let remainingCents = Math.round(newCustomerRequest.initial_payment.amount * 100);
      await onCreateCustomerRequest({
        ...newCustomerRequest,
        items: requestItems.map((item) => ({ ...item })),
        initial_payment: {
          ...newCustomerRequest.initial_payment,
          allocations: requestItems
            .map((item, item_index) => {
              const lineCents = Math.round(item.quantity * item.unit_price * 100);
              const amountCents = item_index === requestItems.length - 1 ? remainingCents : Math.min(lineCents, remainingCents);
              remainingCents -= amountCents;
              return {
                item_index,
                beneficiary_student_id: item.beneficiary_student_id || newCustomerRequest.student_id,
                amount: amountCents / 100,
              };
            })
            .filter((allocation) => allocation.amount > 0),
        },
      });
      setIsRequestModalOpen(false);
      requestButtonRef.current?.focus();
      setNewCustomerRequest((current) => ({
        ...current,
        special_request: '',
        initial_payment: { ...current.initial_payment, amount: 0, reference_number: '', notes: '' },
      }));
      setRequestItems([{ category: 'course', description: 'SSI Freediver', quantity: 1, unit_price: 310, beneficiary_student_id: '' }]);
      await onRefresh();
      await refreshFinanceSettings();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record customer request');
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
      await refreshFinanceSettings();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const openPaymentModal = (inv: Invoice, requestId?: string) => {
    paymentReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelectedInvoiceForPayment(inv);
    setPaymentRequestId(requestId || null);
    const balance = inv.total_amount - inv.paid_amount;
    const cashMethod = `Cash ${inv.currency}`;
    setPaymentData({
      amount: balance,
      currency: inv.currency,
      customer_id: inv.student_id,
      payment_method: cashMethod,
      payment_account: cashMethod,
      payment_date: new Date().toISOString().slice(0, 10),
      reference_number: '',
      notes: `Payment for ${inv.items?.map((item) => item.description).join(', ') || inv.invoice_number}`,
    });
  };

  const closePaymentModal = () => {
    setSelectedInvoiceForPayment(null);
    setPaymentRequestId(null);
  };

  const getRequestId = (invoice: Invoice) =>
    customerRequests.find((request) => request.id === invoice.id)?.request_id;

  const openBill = (invoice: Invoice, requestId = getRequestId(invoice)) => {
    setSelectedBill({ invoice, requestId });
  };

  const handleBillSave = async (invoiceId: string, changes: InvoiceUpdateInput) => {
    await onUpdateInvoice(invoiceId, changes);
    setSelectedBill(null);
    await onRefresh();
  };

  const handleBillPayment = (invoice: Invoice, requestId?: string) => {
    setSelectedBill(null);
    openPaymentModal(invoice, requestId);
  };

  const updateRequestItem = (index: number, patch: Partial<RequestDraftItem>) => {
    setRequestItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  };

  const changeRequestItemCategory = (index: number, category: RequestCategory) => {
    const catalogItem = requestCatalog[category][0];
    const checkInDate = localDateString(new Date());
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 1);
    updateRequestItem(index, {
      category,
      description: catalogItem.description,
      unit_price: newCustomerRequest.currency === 'EUR' ? catalogItem.price : 0,
      ...(category === 'accommodation'
        ? { check_in_date: checkInDate, check_out_date: localDateString(checkOut), quantity: 1 }
        : { check_in_date: undefined, check_out_date: undefined }),
    });
  };

  const changeRequestItemDescription = (index: number, description: string) => {
    const item = requestItems[index];
    const catalogItem = requestCatalog[item.category].find((entry) => entry.description === description);
    updateRequestItem(index, {
      description,
      unit_price: newCustomerRequest.currency === 'EUR' ? catalogItem?.price || 0 : 0,
    });
  };

  const changeRequestCurrency = (currency: string) => {
    const cashMethod = `Cash ${currency}`;
    setNewCustomerRequest((current) => ({
      ...current,
      currency,
      initial_payment: {
        ...current.initial_payment,
        payment_method: cashMethod,
        payment_account: cashMethod,
      },
    }));
    setRequestItems((current) => current.map((item) => {
      const catalogItem = requestCatalog[item.category].find((entry) => entry.description === item.description);
      return { ...item, unit_price: currency === 'EUR' ? catalogItem?.price || 0 : 0 };
    }));
  };

  const paymentCurrency = paymentData.currency as PaymentCurrency;
  const invoiceCurrency = selectedInvoiceForPayment?.currency as PaymentCurrency | undefined;
  const paymentRateToEur = fxRates.rates_to_eur[paymentCurrency] ?? null;
  const invoiceRateToEur = invoiceCurrency ? fxRates.rates_to_eur[invoiceCurrency] ?? null : null;
  const paymentEurEquivalent = paymentRateToEur === null
    ? null
    : Math.round(paymentData.amount * paymentRateToEur * 100) / 100;
  const invoiceCreditEquivalent = selectedInvoiceForPayment && invoiceCurrency
    ? paymentCurrency === invoiceCurrency
      ? paymentData.amount
      : paymentRateToEur !== null && invoiceRateToEur !== null
        ? Math.round(paymentData.amount * paymentRateToEur / invoiceRateToEur * 100) / 100
        : null
    : null;
  const paymentNeedsFxRate = Boolean(
    selectedInvoiceForPayment &&
    invoiceCurrency &&
    paymentCurrency !== invoiceCurrency &&
    (paymentRateToEur === null || invoiceRateToEur === null),
  );
  const paymentExceedsInvoiceBalance = Boolean(
    selectedInvoiceForPayment &&
    invoiceCreditEquivalent !== null &&
    invoiceCreditEquivalent > selectedInvoiceForPayment.total_amount - selectedInvoiceForPayment.paid_amount,
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {frontDeskOnly ? 'Customer Requests' : 'Finance & Billing Ledger'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {frontDeskOnly
              ? 'Record the confirmed request and deposit, then track the customer bill and later payments.'
              : 'Audit-tracked customer requests, invoices, payments, vendor expenses, and center cashflow.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            ref={requestButtonRef}
            onClick={() => {
              setFormError(null);
              setIsRequestModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer Request</span>
          </button>
          {canAccessFinance && (
            <>
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-cyan-200 border border-[#E8EEF7] dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs hover:border-[#4C8BF5]"
              >
                <Plus className="w-4 h-4 text-[#4C8BF5]" />
                <span>New Invoice</span>
              </button>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-cyan-200 border border-[#E8EEF7] dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs hover:border-[#4C8BF5]"
              >
                <Plus className="w-4 h-4 text-[#4C8BF5]" />
                <span>Record Expense</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Financial Summary Cards */}
      {canAccessFinance && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>}

      {/* Tab Switcher */}
      <div role="tablist" aria-label="Customer request and finance views" className="flex flex-wrap items-center gap-2 border-b border-[#E8EEF7] dark:border-slate-800 pb-2">
        <button
          type="button"
          role="tab"
          id="finance-requests-tab"
          aria-selected={activeTab === 'requests'}
          aria-controls="finance-requests-panel"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-[#4C8BF5] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4C8BF5] border border-[#E8EEF7] dark:border-slate-700'
          }`}
        >
          Customer Requests ({customerRequests.length})
        </button>
        {canAccessFinance && <>
        <button
          type="button"
          role="tab"
          id="finance-income-tab"
          aria-selected={activeTab === 'income'}
          aria-controls="finance-income-panel"
          onClick={() => setActiveTab('income')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'income'
              ? 'bg-[#4C8BF5] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4C8BF5] border border-[#E8EEF7] dark:border-slate-700'
          }`}
        >
          Daily Income ({dailyIncome.length})
        </button>
        <button
          type="button"
          role="tab"
          id="finance-expenses-tab"
          aria-selected={activeTab === 'expenses'}
          aria-controls="finance-expenses-panel"
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-[#4C8BF5] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4C8BF5] border border-[#E8EEF7] dark:border-slate-700'
          }`}
        >
          Daily Expenses ({dailyExpenses.length})
        </button>
        <button
          type="button"
          role="tab"
          id="finance-invoices-tab"
          aria-selected={activeTab === 'invoices'}
          aria-controls="finance-invoices-panel"
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
          type="button"
          role="tab"
          id="finance-history-tab"
          aria-selected={activeTab === 'history'}
          aria-controls="finance-history-panel"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-[#4C8BF5] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4C8BF5] border border-[#E8EEF7] dark:border-slate-700'
          }`}
        >
          Customer History & Reports
        </button>
        <button
          type="button"
          role="tab"
          id="finance-movements-tab"
          aria-selected={activeTab === 'movements'}
          aria-controls="finance-movements-panel"
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'movements'
              ? 'bg-[#4C8BF5] text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#4C8BF5] border border-[#E8EEF7] dark:border-slate-700'
          }`}
        >
          Accounts & Categories
        </button>
        </>}
      </div>

      {canAccessFinance && (
        <details className="rounded-xl border border-[#E8EEF7] bg-white dark:border-slate-800 dark:bg-[#1E293B]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:text-white">
            EUR conversion rates
            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
              Payment rates are saved with each receipt.
            </span>
          </summary>
          <form onSubmit={handleSaveFxRates} className="space-y-3 border-t border-[#E8EEF7] p-4 dark:border-slate-800">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Enter how many euros one unit of each currency is worth. Rates are finance-controlled; no rate is guessed or fetched from an outside service.
              {fxRates.updated_at && <> Last updated {new Date(fxRates.updated_at).toLocaleString()} by {fxRates.updated_by_name || 'Finance'}.</>}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="finance-fx-eur" className="mb-1 block text-xs text-slate-600 dark:text-slate-300">EUR → EUR</label>
                <input id="finance-fx-eur" value="1.00000000" readOnly className="min-h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300" />
              </div>
              {(['EGP', 'USD', 'GBP'] as const).map((currency) => (
                <div key={currency}>
                  <label htmlFor={`finance-fx-${currency.toLowerCase()}`} className="mb-1 block text-xs text-slate-600 dark:text-slate-300">
                    1 {currency} equals EUR
                  </label>
                  <input
                    id={`finance-fx-${currency.toLowerCase()}`}
                    type="number"
                    min="0.00000001"
                    max="1000"
                    step="0.00000001"
                    inputMode="decimal"
                    value={fxRateDraft[currency]}
                    onChange={(event) => setFxRateDraft((current) => ({ ...current, [currency]: event.target.value }))}
                    placeholder="Enter current rate"
                    className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
            {fxError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{fxError}</p>}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">A blank rate blocks cross-currency bill payments until set.</p>
              <button type="submit" disabled={fxSaving} className="min-h-10 rounded-lg bg-[#4C8BF5] px-4 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C8BF5]">
                {fxSaving ? 'Saving rates...' : 'Save rates'}
              </button>
            </div>
          </form>
        </details>
      )}

      {activeTab === 'requests' && (
        <section
          id="finance-requests-panel"
          role="tabpanel"
          aria-labelledby="finance-requests-tab"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customer Requests & Bills</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Each request has its own invoice and payment history. New requests are saved with the deposit Gabriella records.
              </p>
            </div>
            <button
              type="button"
              onClick={exportRequestsCsv}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs font-semibold text-cyan-300 transition hover:bg-[#0a1c30]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </button>
          </div>
          <div className="bg-[#0a182a] border border-cyan-900/40 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs text-slate-300">
                <thead className="bg-[#071424] text-cyan-400/90 font-semibold border-b border-cyan-900/50 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="py-3 px-4">Request / Bill</th>
                    <th scope="col" className="py-3 px-4">Customer</th>
                    <th scope="col" className="py-3 px-4">Requested items & notes</th>
                    <th scope="col" className="py-3 px-4">Payments</th>
                    <th scope="col" className="py-3 px-4">Total / balance</th>
                    <th scope="col" className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-900/30">
                  {customerRequests.map((request) => {
                    const balance = Math.max(0, request.total_amount - request.paid_amount);
                    return (
                      <tr key={request.request_id} className="align-top hover:bg-[#0e213b]/60 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-white">{request.request_number}</div>
                          <button
                            type="button"
                            onClick={() => openBill(request, request.request_id)}
                            className="mt-1 min-h-8 rounded px-1 text-left text-[10px] text-cyan-300 underline decoration-dotted underline-offset-2 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                          >
                            Open bill · {request.invoice_number}
                          </button>
                          <div className="text-[10px] text-slate-500">{request.issue_date}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{request.first_name} {request.last_name}</div>
                          <div className="text-[11px] text-slate-400">{request.student_email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <ul className="space-y-1">
                            {(request.items || []).map((item) => (
                              <li key={item.id || item.description}>
                                <span className="text-cyan-200 capitalize">{item.category || 'other'}:</span> {item.description} × {item.quantity}
                              </li>
                            ))}
                          </ul>
                          {request.special_request && (
                            <p className="mt-2 max-w-xs whitespace-pre-wrap text-slate-400">{request.special_request}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(request.payments || []).length > 0 ? (
                            <ul className="space-y-1">
                              {(request.payments || []).map((payment) => (
                                <li key={payment.id}>
                                  <span className="text-slate-400">{payment.payment_date} · {payment.payment_method}</span>
                                  <div className="font-mono text-emerald-300">{payment.currency} {payment.amount.toLocaleString()}</div>
                                </li>
                              ))}
                            </ul>
                          ) : <span className="text-rose-300">No payment recorded</span>}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-white">{request.currency} {request.total_amount.toLocaleString()}</div>
                          <div className="text-emerald-300">Paid: {request.currency} {request.paid_amount.toLocaleString()}</div>
                          {balance > 0 && <div className="text-amber-300">Due: {request.currency} {balance.toLocaleString()}</div>}
                          <span className="mt-1 inline-block rounded-full border border-cyan-900 px-2 py-0.5 text-[10px] uppercase text-cyan-200">
                            {request.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {balance > 0 ? (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(request, request.request_id)}
                              className="min-h-8 rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                            >
                              + Record payment
                            </button>
                          ) : <span className="text-emerald-300">Settled</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {customerRequests.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-500">Confirmed requests will appear here after the deposit is recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {canAccessFinance && activeTab === 'income' && (
        <section
          id="finance-income-panel"
          role="tabpanel"
          aria-labelledby="finance-income-tab"
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Income</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recorded customer payments for the selected date.
              </p>
            </div>
            <div>
              <label htmlFor="daily-income-date" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Income date
              </label>
              <input
                id="daily-income-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={exportDailyIncomeCsv}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export day CSV
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(dailyIncomeTotals).length > 0 ? Object.entries(dailyIncomeTotals).map(([currency, total]) => (
              <div key={currency} className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Income · {currency}</span>
                <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 font-mono">
                  {currency} {total.toLocaleString()}
                </div>
              </div>
            )) : (
              <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                No payments recorded for {selectedDate}.
              </div>
            )}
          </div>

          <div className="bg-[#0a182a] border border-cyan-900/40 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#071424] text-cyan-400/90 font-semibold border-b border-cyan-900/50 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="py-3 px-4">Payment Date</th>
                    <th scope="col" className="py-3 px-4">Customer</th>
                    <th scope="col" className="py-3 px-4">Invoice / Request</th>
                    <th scope="col" className="py-3 px-4">Payment Method</th>
                    <th scope="col" className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-900/30">
                  {dailyIncome.map((payment) => (
                    <tr key={payment.id} className="hover:bg-[#0e213b]/60 transition-colors">
                      <td className="py-3 px-4 text-slate-400">{payment.payment_date}</td>
                      <td className="py-3 px-4 font-semibold text-white">{payment.invoice.first_name} {payment.invoice.last_name}</td>
                      <td className="py-3 px-4 font-mono">
                        <button
                          type="button"
                          onClick={() => openBill(payment.invoice)}
                          className="min-h-8 rounded px-1 text-left text-cyan-300 underline decoration-dotted underline-offset-2 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                        >
                          {payment.invoice.invoice_number}
                        </button>
                        {payment.invoice.customer_request_number && (
                          <div className="text-[10px] text-cyan-300">{payment.invoice.customer_request_number}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">{payment.payment_method}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300">
                        {payment.currency} {payment.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {dailyIncome.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-500">Payments recorded on this date will appear here.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* INVOICES TABLE */}
      {canAccessFinance && activeTab === 'invoices' && (
        <div id="finance-invoices-panel" role="tabpanel" aria-labelledby="finance-invoices-tab" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0a182a] p-3 rounded-xl border border-cyan-900/40">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by invoice number or student name..."
                aria-label="Search invoices by invoice number or student name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#071322] border border-cyan-900/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
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
            <button
              type="button"
              onClick={exportInvoicesCsv}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyan-800 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Export CSV
            </button>
          </div>

          <div className="bg-[#0a182a] border border-cyan-900/40 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#071424] text-cyan-400/90 font-semibold border-b border-cyan-900/50 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="py-3 px-4">Invoice #</th>
                    <th scope="col" className="py-3 px-4">Student</th>
                    <th scope="col" className="py-3 px-4">Dates</th>
                    <th scope="col" className="py-3 px-4">Total Amount</th>
                    <th scope="col" className="py-3 px-4">Paid / Balance</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-900/30">
                  {filteredInvoices.map((inv) => {
                    const balance = inv.total_amount - inv.paid_amount;
                    return (
                      <tr key={inv.id} className="hover:bg-[#0e213b]/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          <button
                            type="button"
                            onClick={() => openBill(inv)}
                            className="min-h-8 rounded px-1 text-left text-cyan-300 underline decoration-dotted underline-offset-2 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                          >
                            {inv.invoice_number}
                          </button>
                          {inv.customer_request_number && (
                            <div className="text-[10px] font-normal text-cyan-300">{inv.customer_request_number}</div>
                          )}
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
                              onClick={() => openPaymentModal(inv, getRequestId(inv))}
                              type="button"
                              className="min-h-9 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
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
      {canAccessFinance && activeTab === 'expenses' && (
        <section id="finance-expenses-panel" role="tabpanel" aria-labelledby="finance-expenses-tab" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Expenses</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recorded center expenses for the selected date.
              </p>
            </div>
            <div>
              <label htmlFor="daily-expenses-date" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Expense date
              </label>
              <input
                id="daily-expenses-date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-800 dark:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(dailyExpenseTotals).length > 0 ? Object.entries(dailyExpenseTotals).map(([currency, total]) => (
              <div key={currency} className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-rose-100 dark:border-rose-900/40">
                <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">Expenses · {currency}</span>
                <div className="text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-1 font-mono">
                  {currency} {total.toLocaleString()}
                </div>
              </div>
            )) : (
              <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
                No expenses recorded for {selectedDate}.
              </div>
            )}
          </div>

          <div className="bg-[#0a182a] border border-cyan-900/40 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#071424] text-cyan-400/90 font-semibold border-b border-cyan-900/50 uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="py-3 px-4">Expense #</th>
                  <th scope="col" className="py-3 px-4">Category</th>
                  <th scope="col" className="py-3 px-4">Vendor</th>
                  <th scope="col" className="py-3 px-4">Amount</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4">Receipt Ref</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-900/30">
                {dailyExpenses.map((exp) => (
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
                {dailyExpenses.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">Expenses recorded on this date will appear here.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </div>
        </section>
      )}

      {canAccessFinance && activeTab === 'history' && (
        <section id="finance-history-panel" role="tabpanel" aria-labelledby="finance-history-tab" className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Customer history & transaction report</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Charges increase the balance; payments and credits reduce it. Refunds, expenses, and balance-only transfers remain visible as separate audit entries.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[
              { title: 'Income by category (EUR)', data: incomeByCategory, barClass: 'bg-emerald-500/80', valueClass: 'text-emerald-300' },
              { title: 'Expenses by category (EUR)', data: expensesByCategory, barClass: 'bg-rose-500/80', valueClass: 'text-rose-300' },
            ].map((chart) => {
              const max = chart.data.length ? chart.data[0][1] : 0;
              return (
                <div key={chart.title} className="rounded-xl border border-cyan-900/40 bg-[#0a182a] p-4 shadow-sm">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-400/90">{chart.title}</h4>
                  {chart.data.length === 0 ? (
                    <p className="text-xs text-slate-500">No records yet.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {chart.data.map(([category, amount]) => (
                        <li key={category}>
                          <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="truncate text-xs text-slate-300">{formatCategoryLabel(category)}</span>
                            <span className={`font-data shrink-0 text-xs tabular-nums ${chart.valueClass}`}>
                              {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[#071322]">
                            <div
                              className={`h-full rounded-full ${chart.barClass}`}
                              style={{ width: `${max > 0 ? Math.max(2, (amount / max) * 100) : 0}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-cyan-900/40 bg-[#0a182a] p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="history-search" className="mb-1 block text-[11px] font-semibold text-slate-300">Search</label>
              <input id="history-search" value={historyFilters.search} onChange={(event) => setHistoryFilters({ ...historyFilters, search: event.target.value })} placeholder="Invoice, customer, service, reference..." className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-customer" className="mb-1 block text-[11px] font-semibold text-slate-300">Customer</label>
              <select id="history-customer" value={historyFilters.customer_id} onChange={(event) => setHistoryFilters({ ...historyFilters, customer_id: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white">
                <option value="">All customers</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="history-from" className="mb-1 block text-[11px] font-semibold text-slate-300">From date</label>
              <input id="history-from" type="date" value={historyFilters.from_date} onChange={(event) => setHistoryFilters({ ...historyFilters, from_date: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-to" className="mb-1 block text-[11px] font-semibold text-slate-300">To date</label>
              <input id="history-to" type="date" value={historyFilters.to_date} onChange={(event) => setHistoryFilters({ ...historyFilters, to_date: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-service" className="mb-1 block text-[11px] font-semibold text-slate-300">Service</label>
              <input id="history-service" value={historyFilters.service} onChange={(event) => setHistoryFilters({ ...historyFilters, service: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-category" className="mb-1 block text-[11px] font-semibold text-slate-300">Category / type</label>
              <input id="history-category" value={historyFilters.category} onChange={(event) => setHistoryFilters({ ...historyFilters, category: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-currency" className="mb-1 block text-[11px] font-semibold text-slate-300">Currency</label>
              <select id="history-currency" value={historyFilters.currency} onChange={(event) => setHistoryFilters({ ...historyFilters, currency: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white">
                <option value="">All currencies</option><option value="EUR">EUR</option><option value="USD">USD</option><option value="EGP">EGP</option><option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label htmlFor="history-method" className="mb-1 block text-[11px] font-semibold text-slate-300">Payment method</label>
              <input id="history-method" value={historyFilters.method} onChange={(event) => setHistoryFilters({ ...historyFilters, method: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-account" className="mb-1 block text-[11px] font-semibold text-slate-300">Payment account</label>
              <input id="history-account" value={historyFilters.account} onChange={(event) => setHistoryFilters({ ...historyFilters, account: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-staff" className="mb-1 block text-[11px] font-semibold text-slate-300">Staff member</label>
              <input id="history-staff" value={historyFilters.staff} onChange={(event) => setHistoryFilters({ ...historyFilters, staff: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-supplier" className="mb-1 block text-[11px] font-semibold text-slate-300">Supplier</label>
              <input id="history-supplier" value={historyFilters.supplier} onChange={(event) => setHistoryFilters({ ...historyFilters, supplier: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
            <div>
              <label htmlFor="history-status" className="mb-1 block text-[11px] font-semibold text-slate-300">Status / reason</label>
              <input id="history-status" value={historyFilters.status} onChange={(event) => setHistoryFilters({ ...historyFilters, status: event.target.value })} className="min-h-10 w-full rounded-lg border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-cyan-900/40 bg-[#0a182a]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1450px] text-left text-xs text-slate-300">
                <thead className="border-b border-cyan-900/50 bg-[#071424] text-[10px] uppercase tracking-wider text-cyan-300">
                  <tr>{['Date', 'Transaction', 'Customer', 'Supplier', 'Invoice / Ref', 'Service / notes', 'Category', 'Amount', 'Method', 'Account', 'Staff', 'Status / reason'].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-cyan-900/30">
                  {filteredHistoryRows.map((row) => (
                    <tr key={row.id} className="align-top hover:bg-[#0e213b]/60">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-400">{row.date}</td>
                      <td className="px-3 py-3 font-semibold text-white">{row.type}</td>
                      <td className="px-3 py-3">{row.customer || '—'}</td>
                      <td className="px-3 py-3">{row.supplier || '—'}</td>
                      <td className="px-3 py-3 font-mono">
                        {row.invoiceId ? (
                          <button type="button" onClick={() => {
                            const invoice = invoices.find((candidate) => candidate.id === row.invoiceId);
                            if (invoice) openBill(invoice);
                          }} className="min-h-8 rounded px-1 text-cyan-300 underline decoration-dotted underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{row.invoice}</button>
                        ) : row.invoice}
                      </td>
                      <td className="max-w-xs whitespace-pre-wrap px-3 py-3">{row.service}</td>
                      <td className="px-3 py-3 capitalize">{row.category.replace('_', ' ')}</td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-mono font-bold ${row.amount < 0 ? 'text-emerald-300' : row.type === 'Supplier expense' ? 'text-rose-300' : 'text-white'}`}>
                        {row.amount < 0 ? '−' : ''}{row.currency} {Math.abs(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3">{row.method || '—'}</td>
                      <td className="px-3 py-3">{row.account || '—'}</td>
                      <td className="px-3 py-3">{row.staff || '—'}</td>
                      <td className="max-w-xs whitespace-pre-wrap px-3 py-3">{row.status}</td>
                    </tr>
                  ))}
                  {filteredHistoryRows.length === 0 && <tr><td colSpan={12} className="py-10 text-center text-slate-500">No transactions match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {canAccessFinance && activeTab === 'movements' && (
        <section id="finance-movements-panel" role="tabpanel" aria-labelledby="finance-movements-tab" className="space-y-5">
          {formError && <div role="alert" className="rounded-lg border border-rose-800 bg-rose-950/70 p-3 text-xs text-rose-200">{formError}</div>}
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-cyan-900/40 bg-[#0a182a] p-4">
              <div>
                <h3 className="font-bold text-white">Account balances</h3>
                <p className="text-[11px] text-slate-400">Current balance = opening amount + receipts − refunds − expenses ± balance movements.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs text-slate-300">
                  <thead><tr className="border-b border-cyan-900/50 text-[10px] uppercase text-cyan-300"><th className="py-2">Account</th><th className="py-2">Currency</th><th className="py-2">Opening</th><th className="py-2">Receipts</th><th className="py-2">Expenses</th><th className="py-2">Current</th></tr></thead>
                  <tbody className="divide-y divide-cyan-900/30">
                    {accountBalances.map((balance) => <tr key={`${balance.currency}:${balance.account}`}>
                      <td className="py-2">{balance.account}</td><td>{balance.currency}</td><td>{balance.opening_balance.toLocaleString()}</td><td className="text-emerald-300">{balance.income.toLocaleString()}</td><td className="text-rose-300">{balance.expenses.toLocaleString()}</td><td className="font-mono font-bold text-white">{balance.current_balance.toLocaleString()}</td>
                    </tr>)}
                    {accountBalances.length === 0 && <tr><td colSpan={6} className="py-5 text-center text-slate-500">No posted account activity or opening balances yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <h4 className="pt-2 text-sm font-semibold text-white">Opening balances</h4>
              <div className="space-y-2">
                {openingBalanceDraft.map((balance, index) => (
                  <div key={`${balance.account}-${balance.currency}-${index}`} className="grid grid-cols-12 gap-2">
                    <input aria-label={`Opening balance account ${index + 1}`} value={balance.account} onChange={(event) => setOpeningBalanceDraft((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, account: event.target.value } : row))} placeholder="Account name" className="col-span-6 min-h-9 rounded border border-cyan-900/50 bg-[#071322] px-2 text-xs text-white" />
                    <select aria-label={`Opening balance currency ${index + 1}`} value={balance.currency} onChange={(event) => setOpeningBalanceDraft((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, currency: event.target.value } : row))} className="col-span-2 min-h-9 rounded border border-cyan-900/50 bg-[#071322] px-2 text-xs text-white"><option>EUR</option><option>USD</option><option>EGP</option><option>GBP</option></select>
                    <input aria-label={`Opening balance amount ${index + 1}`} type="number" min="0" step="0.01" value={balance.amount} onChange={(event) => setOpeningBalanceDraft((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, amount: Number(event.target.value) } : row))} className="col-span-3 min-h-9 rounded border border-cyan-900/50 bg-[#071322] px-2 text-right text-xs text-white" />
                    <button type="button" aria-label={`Remove opening balance ${balance.account}`} onClick={() => setOpeningBalanceDraft((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="col-span-1 min-h-9 rounded text-rose-300 hover:bg-rose-950/50">×</button>
                  </div>
                ))}
                <div className="flex flex-wrap justify-between gap-2">
                  <button type="button" onClick={() => setOpeningBalanceDraft((current) => [...current, { account: '', currency: 'EUR', amount: 0 }])} className="min-h-9 rounded border border-cyan-800 px-3 text-xs text-cyan-200">Add account</button>
                  <button type="button" disabled={submitting} onClick={handleSaveOpeningBalances} className="min-h-9 rounded bg-cyan-600 px-4 text-xs font-semibold text-white disabled:opacity-50">Save opening balances</button>
                </div>
              </div>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-3 rounded-xl border border-cyan-900/40 bg-[#0a182a] p-4">
              <div>
                <h3 className="font-bold text-white">Record account movement</h3>
                <p className="text-[11px] text-slate-400">Transfers and exchanges update account positions only; they are not income or expenses.</p>
              </div>
              <div>
                <label htmlFor="movement-type" className="mb-1 block text-[11px] font-semibold text-slate-300">Movement type</label>
                <select id="movement-type" value={movementForm.movement_type} onChange={(event) => setMovementForm({ ...movementForm, movement_type: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white"><option value="transfer">Transfer</option><option value="exchange">Currency exchange</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-[11px] text-slate-300">From account<input required maxLength={100} value={movementForm.from_account} onChange={(event) => setMovementForm({ ...movementForm, from_account: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" /></label>
                <label className="space-y-1 text-[11px] text-slate-300">To account<input required maxLength={100} value={movementForm.to_account} onChange={(event) => setMovementForm({ ...movementForm, to_account: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" /></label>
                <label className="space-y-1 text-[11px] text-slate-300">From currency<select value={movementForm.from_currency} onChange={(event) => setMovementForm({ ...movementForm, from_currency: event.target.value, ...(movementForm.movement_type === 'transfer' ? { to_currency: event.target.value } : {}) })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white"><option>EUR</option><option>USD</option><option>EGP</option><option>GBP</option></select></label>
                <label className="space-y-1 text-[11px] text-slate-300">To currency<select value={movementForm.to_currency} onChange={(event) => setMovementForm({ ...movementForm, to_currency: event.target.value })} disabled={movementForm.movement_type === 'transfer'} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white"><option>EUR</option><option>USD</option><option>EGP</option><option>GBP</option></select></label>
                <label className="space-y-1 text-[11px] text-slate-300">Amount out<input required type="number" min="0.01" step="0.01" value={movementForm.from_amount || ''} onChange={(event) => setMovementForm({ ...movementForm, from_amount: Number(event.target.value), ...(movementForm.movement_type === 'transfer' ? { to_amount: Number(event.target.value) } : {}) })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" /></label>
                <label className="space-y-1 text-[11px] text-slate-300">Amount in<input required type="number" min="0.01" step="0.01" value={movementForm.to_amount || ''} onChange={(event) => setMovementForm({ ...movementForm, to_amount: Number(event.target.value) })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" /></label>
                <label className="space-y-1 text-[11px] text-slate-300">Date<input required type="date" value={movementForm.movement_date} onChange={(event) => setMovementForm({ ...movementForm, movement_date: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" /></label>
                <label className="space-y-1 text-[11px] text-slate-300">Reference<input maxLength={100} value={movementForm.reference_number} onChange={(event) => setMovementForm({ ...movementForm, reference_number: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" /></label>
              </div>
              <label className="block space-y-1 text-[11px] text-slate-300">Notes<input maxLength={500} value={movementForm.notes} onChange={(event) => setMovementForm({ ...movementForm, notes: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" /></label>
              <button type="submit" disabled={submitting} className="min-h-10 rounded bg-emerald-600 px-4 text-xs font-semibold text-white disabled:opacity-50">{submitting ? 'Saving…' : 'Record movement'}</button>
            </form>
          </div>

          <div className="space-y-3 rounded-xl border border-cyan-900/40 bg-[#0a182a] p-4">
            <div>
              <h3 className="font-bold text-white">Editable transaction categories</h3>
              <p className="text-[11px] text-slate-400">“Bill customer” is a charge category; “FDD Income Receipt” is an income category. Neither is an expense.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Category type">
              {(['expense', 'billing', 'income'] as const).map((type) => <button key={type} type="button" onClick={() => setCategoryType(type)} aria-pressed={categoryType === type} className={`min-h-9 rounded-lg px-3 text-xs font-semibold capitalize ${categoryType === type ? 'bg-cyan-600 text-white' : 'border border-cyan-900 text-slate-300'}`}>{type}</button>)}
            </div>
            <div className="flex flex-wrap gap-2">
              {financeCategories[categoryType].map((category) => <span key={category} className="inline-flex items-center gap-1 rounded-full border border-cyan-900/70 bg-[#071322] px-3 py-1 text-xs text-cyan-100">
                {category}<button type="button" aria-label={`Remove ${category}`} onClick={() => setFinanceCategories((current) => ({ ...current, [categoryType]: current[categoryType].filter((item) => item !== category) }))} className="min-h-6 min-w-6 rounded-full text-rose-300 hover:bg-rose-950/50">×</button>
              </span>)}
            </div>
            <div className="flex flex-wrap gap-2">
              <input aria-label={`New ${categoryType} category`} value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} maxLength={80} className="min-h-10 flex-1 rounded border border-cyan-900/50 bg-[#071322] px-3 text-xs text-white" placeholder="Add a category" />
              <button type="button" disabled={!categoryDraft.trim()} onClick={() => {
                const normalized = categoryDraft.trim();
                if (financeCategories[categoryType].some((item) => item.toLowerCase() === normalized.toLowerCase())) {
                  setFormError('That category already exists.');
                  return;
                }
                setFormError(null);
                setFinanceCategories((current) => ({ ...current, [categoryType]: [...current[categoryType], normalized] }));
                setCategoryDraft('');
              }} className="min-h-10 rounded border border-cyan-800 px-4 text-xs text-cyan-200 disabled:opacity-40">Add</button>
              <button type="button" disabled={submitting} onClick={handleSaveCategories} className="min-h-10 rounded bg-cyan-600 px-4 text-xs font-semibold text-white disabled:opacity-50">Save categories</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-cyan-900/40 bg-[#0a182a]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs text-slate-300">
                <thead><tr className="border-b border-cyan-900/50 bg-[#071424] text-[10px] uppercase text-cyan-300"><th className="px-3 py-3">Date</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">From</th><th className="px-3 py-3">To</th><th className="px-3 py-3">Reference / notes</th><th className="px-3 py-3">Staff</th></tr></thead>
                <tbody className="divide-y divide-cyan-900/30">{accountMovements.map((movement) => <tr key={movement.id}>
                  <td className="px-3 py-3">{movement.movement_date}</td><td className="px-3 py-3 capitalize">{movement.movement_type}</td><td className="px-3 py-3">{movement.from_currency} {movement.from_amount_cents / 100} · {movement.from_account}</td><td className="px-3 py-3">{movement.to_currency} {movement.to_amount_cents / 100} · {movement.to_account}</td><td className="px-3 py-3">{movement.reference_number || movement.notes || '—'}</td><td className="px-3 py-3">{movement.recorded_by_name || '—'}</td>
                </tr>)}
                {accountMovements.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No transfers or exchanges recorded.</td></tr>}</tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* CREATE CUSTOMER REQUEST MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            ref={requestDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-request-title"
            className="bg-[#091728] border border-cyan-800/60 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto text-slate-200 shadow-2xl"
          >
            <div className="p-5 border-b border-cyan-900/50 flex items-center justify-between bg-[#071322]">
              <h3 id="customer-request-title" className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Record Customer Request & Deposit</span>
              </h3>
              <button
                type="button"
                aria-label="Close customer request form"
                onClick={() => {
                  setIsRequestModalOpen(false);
                  requestButtonRef.current?.focus();
                }}
                className="min-h-8 min-w-8 p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomerRequestSubmit} className="p-5 sm:p-6 space-y-5 text-xs">
              {formError && (
                <div role="alert" className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="request-customer" className="block text-slate-300 mb-1">Customer *</label>
                  <select
                    id="request-customer"
                    required
                    disabled={students.length === 0}
                    value={newCustomerRequest.student_id}
                    onChange={(event) => setNewCustomerRequest({ ...newCustomerRequest, student_id: event.target.value })}
                    className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.email})
                      </option>
                    ))}
                    {students.length === 0 && <option value="">No customer records available</option>}
                  </select>
                </div>
                <div>
                  <label htmlFor="request-due-date" className="block text-slate-300 mb-1">Bill due date *</label>
                  <input
                    id="request-due-date"
                    type="date"
                    required
                    value={newCustomerRequest.due_date}
                    onChange={(event) => setNewCustomerRequest({ ...newCustomerRequest, due_date: event.target.value })}
                    className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  />
                </div>
                <div>
                  <label htmlFor="request-currency" className="block text-slate-300 mb-1">Bill currency *</label>
                  <select
                    id="request-currency"
                    value={newCustomerRequest.currency}
                    onChange={(event) => changeRequestCurrency(event.target.value)}
                    className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="EGP">EGP (Egyptian Pound)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-white">Courses, packages, activities, accommodation & shop</h4>
                  <button
                    type="button"
                    onClick={() => setRequestItems((current) => [
                      ...current,
                      { category: 'course', description: requestCatalog.course[0].description, quantity: 1, unit_price: newCustomerRequest.currency === 'EUR' ? requestCatalog.course[0].price : 0, beneficiary_student_id: '' },
                    ])}
                    className="min-h-8 rounded-lg border border-cyan-800 px-3 py-1 text-cyan-200 hover:bg-cyan-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    + Add item
                  </button>
                </div>
                {requestItems.map((item, index) => {
                  const unit = requestCatalog[item.category].find((entry) => entry.description === item.description)?.unit;
                  return (
                    <div key={`${index}-${item.category}`} className="grid grid-cols-1 sm:grid-cols-12 gap-3 rounded-xl border border-cyan-900/50 bg-[#0c1f36] p-3">
                      <div className="sm:col-span-3">
                        <label htmlFor={`request-category-${index}`} className="block text-slate-300 mb-1">Type</label>
                        <select
                          id={`request-category-${index}`}
                          value={item.category}
                          onChange={(event) => changeRequestItemCategory(index, event.target.value as RequestCategory)}
                          className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                        >
                          <option value="course">Course</option>
                          <option value="package">Package</option>
                          <option value="activity">Activity</option>
                          <option value="workshop">Workshop</option>
                          <option value="training">Training session</option>
                          <option value="accommodation">Accommodation</option>
                          <option value="shop">Shop product</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="sm:col-span-12">
                        <label htmlFor={`request-beneficiary-${index}`} className="block text-slate-300 mb-1">Service for *</label>
                        <select
                          id={`request-beneficiary-${index}`}
                          required
                          value={item.beneficiary_student_id || newCustomerRequest.student_id}
                          onChange={(event) => updateRequestItem(index, { beneficiary_student_id: event.target.value })}
                          className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                        >
                          {students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
                        </select>
                      </div>
                      <div className="sm:col-span-5">
                        <label htmlFor={`request-description-${index}`} className="block text-slate-300 mb-1">Item *</label>
                        <select
                          id={`request-description-${index}`}
                          required
                          value={item.description}
                          onChange={(event) => changeRequestItemDescription(index, event.target.value)}
                          className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                        >
                          {requestCatalog[item.category].map((catalogItem) => (
                            <option key={catalogItem.description} value={catalogItem.description}>
                              {catalogItem.description}
                            </option>
                          ))}
                        </select>
                      </div>
                      {item.category === 'accommodation' && (
                        <div className="sm:col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label htmlFor={`request-check-in-${index}`} className="block text-slate-300 mb-1">Check-in *</label>
                            <input
                              id={`request-check-in-${index}`}
                              type="date"
                              required
                              value={item.check_in_date || ''}
                              onChange={(event) => {
                                const checkInDate = event.target.value;
                                const nights = stayNights(checkInDate, item.check_out_date);
                                updateRequestItem(index, { check_in_date: checkInDate, ...(nights > 0 ? { quantity: nights } : {}) });
                              }}
                              className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                            />
                          </div>
                          <div>
                            <label htmlFor={`request-check-out-${index}`} className="block text-slate-300 mb-1">Check-out *</label>
                            <input
                              id={`request-check-out-${index}`}
                              type="date"
                              required
                              min={item.check_in_date}
                              value={item.check_out_date || ''}
                              onChange={(event) => {
                                const checkOutDate = event.target.value;
                                const nights = stayNights(item.check_in_date, checkOutDate);
                                updateRequestItem(index, { check_out_date: checkOutDate, ...(nights > 0 ? { quantity: nights } : {}) });
                              }}
                              className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                            />
                          </div>
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <label htmlFor={`request-quantity-${index}`} className="block text-slate-300 mb-1">{unit === 'night' ? 'Nights' : 'Quantity'} *</label>
                        <input
                          id={`request-quantity-${index}`}
                          type="number"
                          required
                          min={1}
                          step={1}
                          value={item.quantity}
                          onChange={(event) => updateRequestItem(index, { quantity: Number(event.target.value) })}
                          className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor={`request-price-${index}`} className="block text-slate-300 mb-1">Price / {unit || 'item'} *</label>
                        <input
                          id={`request-price-${index}`}
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={item.unit_price || ''}
                          onChange={(event) => updateRequestItem(index, { unit_price: Number(event.target.value) })}
                          className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                        />
                      </div>
                      {requestItems.length > 1 && (
                        <div className="sm:col-span-12 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setRequestItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                            className="min-h-8 px-3 text-rose-300 hover:text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
                          >
                            Remove item
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="text-[11px] text-slate-400">
                  Website course and package prices are suggested in EUR. Accommodation is season/occupancy dependent, and shop prices are not published; enter the agreed price. Add dates, room needs, sizes, or other details in special notes.
                </p>
                <div className="text-right font-data text-sm font-bold text-white">
                  Request total: {newCustomerRequest.currency} {requestTotal.toLocaleString()}
                </div>
              </div>

              <div>
                <label htmlFor="request-special-notes" className="block text-slate-300 mb-1">Special request / notes</label>
                <textarea
                  id="request-special-notes"
                  rows={3}
                  maxLength={2000}
                  value={newCustomerRequest.special_request}
                  onChange={(event) => setNewCustomerRequest({ ...newCustomerRequest, special_request: event.target.value })}
                  placeholder="Dates, accommodation nights/occupancy, shirt size, customer preferences..."
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                />
              </div>

              <fieldset className="space-y-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                <legend className="px-2 font-semibold text-emerald-200">Deposit received *</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="request-deposit" className="block text-slate-300 mb-1">
                      Amount ({newCustomerRequest.currency}) * — applies to the whole bill
                    </label>
                    <input
                      id="request-deposit"
                      type="number"
                      required
                      min="0.01"
                      max={requestTotal}
                      step="0.01"
                      value={newCustomerRequest.initial_payment.amount || ''}
                      onChange={(event) => setNewCustomerRequest({
                        ...newCustomerRequest,
                        initial_payment: { ...newCustomerRequest.initial_payment, amount: Number(event.target.value) },
                      })}
                      className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="request-payment-method" className="block text-slate-300 mb-1">Method *</label>
                    <select
                      id="request-payment-method"
                      value={newCustomerRequest.initial_payment.payment_method}
                      onChange={(event) => setNewCustomerRequest((current) => ({
                        ...current,
                        initial_payment: {
                          ...current.initial_payment,
                          payment_method: event.target.value,
                          payment_account: current.initial_payment.payment_account.startsWith('Cash ')
                            ? event.target.value
                            : current.initial_payment.payment_account,
                        },
                      }))}
                      className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    >
                      <option value={`Cash ${newCustomerRequest.currency}`}>Cash ({newCustomerRequest.currency})</option>
                      <option value="Credit Card">Credit card</option>
                      <option value="Bank Transfer">Bank transfer</option>
                      <option value="InstaPay Egypt">InstaPay Egypt</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="request-payment-account" className="block text-slate-300 mb-1">Payment account *</label>
                    <input
                      id="request-payment-account"
                      required
                      maxLength={100}
                      value={newCustomerRequest.initial_payment.payment_account}
                      onChange={(event) => setNewCustomerRequest({
                        ...newCustomerRequest,
                        initial_payment: { ...newCustomerRequest.initial_payment, payment_account: event.target.value },
                      })}
                      className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="request-payment-date" className="block text-slate-300 mb-1">Payment date *</label>
                    <input
                      id="request-payment-date"
                      type="date"
                      required
                      value={newCustomerRequest.initial_payment.payment_date}
                      onChange={(event) => setNewCustomerRequest({
                        ...newCustomerRequest,
                        initial_payment: { ...newCustomerRequest.initial_payment, payment_date: event.target.value },
                      })}
                      className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    />
                  </div>
                  <div>
                    <label htmlFor="request-payment-reference" className="block text-slate-300 mb-1">Payment reference</label>
                    <input
                      id="request-payment-reference"
                      maxLength={100}
                      value={newCustomerRequest.initial_payment.reference_number}
                      onChange={(event) => setNewCustomerRequest({
                        ...newCustomerRequest,
                        initial_payment: { ...newCustomerRequest.initial_payment, reference_number: event.target.value },
                      })}
                      className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="request-payment-notes" className="block text-slate-300 mb-1">Deposit notes</label>
                    <input
                      id="request-payment-notes"
                      maxLength={500}
                      value={newCustomerRequest.initial_payment.notes}
                      onChange={(event) => setNewCustomerRequest({
                        ...newCustomerRequest,
                        initial_payment: { ...newCustomerRequest.initial_payment, notes: event.target.value },
                      })}
                      className="w-full min-h-10 bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    />
                  </div>
                </div>
              </fieldset>

              <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsRequestModalOpen(false);
                    requestButtonRef.current?.focus();
                  }}
                  className="min-h-10 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || students.length === 0 || requestItems.some((item) => item.unit_price <= 0)}
                  className="min-h-10 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
                >
                  {submitting ? 'Saving request...' : 'Save request & deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedInvoiceForPayment && (
        <div
          ref={paymentDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="finance-payment-title"
          tabIndex={-1}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-[#091728] border border-cyan-800/60 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-cyan-900/50 flex items-center justify-between bg-[#071322]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span id="finance-payment-title">Record Customer Payment</span>
              </h3>
              <button
                type="button"
                aria-label="Close payment form"
                onClick={closePaymentModal}
                className="min-h-10 min-w-10 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                <X className="w-5 h-5 mx-auto" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div role="alert" className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="finance-payment-amount" className="block text-slate-400 mb-1">Amount received *</label>
                  <input
                    id="finance-payment-amount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData((current) => ({ ...current, amount: Number(e.target.value) }))}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="finance-payment-currency" className="block text-slate-400 mb-1">Currency received *</label>
                  <select
                    id="finance-payment-currency"
                    required
                    value={paymentData.currency}
                    onChange={(event) => {
                      const nextCurrency = event.target.value as PaymentCurrency;
                      const sourceRate = fxRates.rates_to_eur[nextCurrency];
                      const invoiceRate = selectedInvoiceForPayment
                        ? fxRates.rates_to_eur[selectedInvoiceForPayment.currency as PaymentCurrency]
                        : null;
                      const balance = selectedInvoiceForPayment
                        ? selectedInvoiceForPayment.total_amount - selectedInvoiceForPayment.paid_amount
                        : 0;
                      const nextAmount = sourceRate !== null && sourceRate !== undefined &&
                        invoiceRate !== null && invoiceRate !== undefined
                        ? Math.round(balance * invoiceRate / sourceRate * 100) / 100
                        : paymentData.amount;
                      setPaymentData((current) => ({
                        ...current,
                        amount: nextAmount,
                        currency: nextCurrency,
                        payment_method: current.payment_method.startsWith('Cash ') ? `Cash ${nextCurrency}` : current.payment_method,
                        payment_account: current.payment_account.startsWith('Cash ') ? `Cash ${nextCurrency}` : current.payment_account,
                      }));
                    }}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    <option value="EUR">EUR — Euro</option>
                    <option value="EGP">EGP — Egyptian Pound</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="finance-payment-method" className="block text-slate-400 mb-1">Payment Method *</label>
                  <select
                    id="finance-payment-method"
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData((current) => ({
                      ...current,
                      payment_method: e.target.value,
                      payment_account: ['Cash EUR', 'Cash EGP', 'Cash USD', 'Cash GBP', 'Credit Card', 'Bank Transfer', 'InstaPay Egypt'].includes(current.payment_account)
                        ? e.target.value
                        : current.payment_account,
                    }))}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    <option value={`Cash ${paymentData.currency}`}>Cash ({paymentData.currency})</option>
                    <option value="Credit Card">Credit Card Terminal</option>
                    <option value="Bank Transfer">International Wire / SEPA</option>
                    <option value="InstaPay Egypt">InstaPay Egypt</option>
                  </select>
                </div>
              </div>

              <div aria-live="polite" className={`rounded-lg border p-3 ${paymentNeedsFxRate ? 'border-amber-800/60 bg-amber-950/30 text-amber-200' : 'border-cyan-900/50 bg-[#0c1f36] text-slate-300'}`}>
                {paymentNeedsFxRate ? (
                  <p>
                    An exchange rate is needed to apply this payment to the bill. Ask Finance to save the current EUR rates below the finance tabs.
                  </p>
                ) : paymentExceedsInvoiceBalance ? (
                  <p role="alert">The converted payment is greater than the remaining bill balance.</p>
                ) : (
                  <p>
                    {paymentEurEquivalent === null
                      ? 'The payment will be recorded in its received currency; a EUR equivalent is not configured for this rate.'
                      : `EUR equivalent: €${paymentEurEquivalent.toFixed(2)}.`}
                    {invoiceCreditEquivalent !== null && (
                      <> Bill credit: {selectedInvoiceForPayment.currency} {invoiceCreditEquivalent.toFixed(2)}.</>
                    )}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="finance-payment-date" className="block text-slate-400 mb-1">Payment date *</label>
                  <input id="finance-payment-date" type="date" required value={paymentData.payment_date} onChange={(event) => setPaymentData({ ...paymentData, payment_date: event.target.value })} className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" />
                </div>
                <div>
                  <label htmlFor="finance-payment-account" className="block text-slate-400 mb-1">Payment account *</label>
                  <input id="finance-payment-account" required maxLength={100} value={paymentData.payment_account} onChange={(event) => setPaymentData({ ...paymentData, payment_account: event.target.value })} className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400" />
                </div>
              </div>

              <div>
                <label htmlFor="finance-payment-reference" className="block text-slate-400 mb-1">Transaction / Reference #</label>
                <input
                  id="finance-payment-reference"
                  type="text"
                  value={paymentData.reference_number}
                  onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                  placeholder="e.g. CC-STR-941824 or Cash Receipt #"
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label htmlFor="finance-payment-notes" className="block text-slate-400 mb-1">Audit Ledger Notes</label>
                <input
                  id="finance-payment-notes"
                  type="text"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/50">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="min-h-10 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || paymentNeedsFxRate || paymentExceedsInvoiceBalance}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-md"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {adjustmentTarget && (
        <dialog ref={adjustmentDialogRef} aria-labelledby="finance-adjustment-title" onClose={() => setAdjustmentTarget(null)} className="m-auto max-h-[90vh] w-[min(96vw,600px)] overflow-hidden rounded-2xl border border-rose-900/60 bg-[#091728] p-0 text-slate-200 shadow-2xl backdrop:bg-black/75">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-rose-900/60 bg-[#091728] text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-rose-900/50 bg-[#071322] p-5">
              <div>
                <h3 id="finance-adjustment-title" className="font-bold text-white">Refund, reversal, or correction</h3>
                <p className="mt-1 text-[11px] text-slate-400">{adjustmentTarget.invoice.invoice_number} · {adjustmentTarget.payment.payment_date} · {adjustmentTarget.payment.currency} {adjustmentTarget.payment.amount.toFixed(2)}</p>
              </div>
              <button type="button" aria-label="Close adjustment form" onClick={() => setAdjustmentTarget(null)} className="min-h-10 min-w-10 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><X className="mx-auto h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAdjustmentSubmit} className="space-y-4 p-5 text-xs">
              {formError && <div role="alert" className="rounded-lg border border-rose-800 bg-rose-950/80 p-3 text-rose-200">{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-slate-300">Adjustment type
                  <select value={adjustmentData.adjustment_type} onChange={(event) => setAdjustmentData({ ...adjustmentData, adjustment_type: event.target.value, direction: event.target.value === 'correction' ? adjustmentData.direction : 'debit' })} className="min-h-10 w-full rounded border border-cyan-900/60 bg-[#071322] p-2 text-white">
                    <option value="refund">Refund</option><option value="reversal">Full reversal</option><option value="correction">Correction</option>
                  </select>
                </label>
                <label className="space-y-1 text-slate-300">Direction
                  <select value={adjustmentData.direction} disabled={adjustmentData.adjustment_type !== 'correction'} onChange={(event) => setAdjustmentData({ ...adjustmentData, direction: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/60 bg-[#071322] p-2 text-white disabled:opacity-60">
                    <option value="debit">Debit · reduces cash collected</option><option value="credit">Credit · increases cash collected</option>
                  </select>
                </label>
                <label className="space-y-1 text-slate-300">Date
                  <input required type="date" value={adjustmentData.adjustment_date} onChange={(event) => setAdjustmentData({ ...adjustmentData, adjustment_date: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/60 bg-[#071322] p-2 text-white" />
                </label>
                <label className="space-y-1 text-slate-300">Refund / adjustment method
                  <select value={adjustmentData.payment_method} onChange={(event) => setAdjustmentData({ ...adjustmentData, payment_method: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/60 bg-[#071322] p-2 text-white">
                    <option value={`Cash ${adjustmentTarget.payment.currency}`}>Cash ({adjustmentTarget.payment.currency})</option><option value="Credit Card">Credit card</option><option value="Bank Transfer">Bank transfer</option><option value="InstaPay Egypt">InstaPay Egypt</option>
                  </select>
                </label>
                <label className="space-y-1 text-slate-300">Account
                  <input required maxLength={100} value={adjustmentData.payment_account} onChange={(event) => setAdjustmentData({ ...adjustmentData, payment_account: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/60 bg-[#071322] p-2 text-white" />
                </label>
                <label className="space-y-1 text-slate-300">Reference
                  <input maxLength={100} value={adjustmentData.reference_number} onChange={(event) => setAdjustmentData({ ...adjustmentData, reference_number: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/60 bg-[#071322] p-2 text-white" />
                </label>
              </div>
              <label className="block space-y-1 text-slate-300">Reason *
                <input required maxLength={500} value={adjustmentData.reason} onChange={(event) => setAdjustmentData({ ...adjustmentData, reason: event.target.value })} className="min-h-10 w-full rounded border border-cyan-900/60 bg-[#071322] p-2 text-white" />
              </label>
              <fieldset className="space-y-2 rounded-xl border border-rose-900/50 bg-[#0c1f36] p-3">
                <legend className="px-2 font-semibold text-rose-200">Allocate to original payment services *</legend>
                {adjustmentAllocations.map((allocation, index) => {
                  const original = allocation.payment_allocation_id
                    ? adjustmentTarget.payment.allocations?.find((item) => item.id === allocation.payment_allocation_id)
                    : undefined;
                  return (
                    <div key={allocation.payment_allocation_id || `${allocation.item_id}-${index}`} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                      {original ? (
                        <span className="text-slate-300">{original.service_label} · {[original.beneficiary_first_name, original.beneficiary_last_name].filter(Boolean).join(' ') || 'Customer'}</span>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="sr-only" htmlFor={`adjustment-service-${index}`}>Service</label>
                          <select id={`adjustment-service-${index}`} required value={allocation.item_id} onChange={(event) => setAdjustmentAllocations((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, item_id: event.target.value } : row))} className="min-h-10 rounded border border-cyan-900/60 bg-[#071322] p-2 text-white">
                            {(adjustmentTarget.invoice.items || []).map((item) => <option key={item.id} value={item.id}>{item.description}</option>)}
                          </select>
                          <label className="sr-only" htmlFor={`adjustment-beneficiary-${index}`}>Beneficiary</label>
                          <select id={`adjustment-beneficiary-${index}`} required value={allocation.beneficiary_student_id} onChange={(event) => setAdjustmentAllocations((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, beneficiary_student_id: event.target.value } : row))} className="min-h-10 rounded border border-cyan-900/60 bg-[#071322] p-2 text-white">
                            {students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
                          </select>
                        </div>
                      )}
                      <label className="sr-only" htmlFor={`adjustment-amount-${index}`}>Adjustment amount for {original?.service_label || `service ${index + 1}`}</label>
                      <input id={`adjustment-amount-${index}`} type="number" min="0" max={original ? original.amount_cents / 100 : adjustmentTarget.payment.amount} step="0.01" value={allocation.amount || ''} onChange={(event) => setAdjustmentAllocations((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, amount: Number(event.target.value) } : row))} className="min-h-10 rounded border border-cyan-900/60 bg-[#071322] p-2 text-right font-mono text-white" />
                    </div>
                  );
                })}
                <p className="text-right font-mono font-semibold text-white">
                  Adjustment total: {adjustmentTarget.payment.currency} {adjustmentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0).toFixed(2)}
                </p>
              </fieldset>
              <p className="text-[11px] text-slate-400">This creates an append-only, staff-attributed record linked to the original payment. It cannot be silently edited or deleted.</p>
              <div className="flex justify-end gap-2 border-t border-cyan-900/50 pt-3">
                <button type="button" onClick={() => setAdjustmentTarget(null)} className="min-h-10 rounded-xl bg-slate-800 px-4 text-slate-300">Cancel</button>
                <button type="submit" disabled={submitting || adjustmentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0) <= 0} className="min-h-10 rounded-xl bg-rose-600 px-4 font-semibold text-white disabled:opacity-50">{submitting ? 'Recording…' : 'Record adjustment'}</button>
              </div>
            </form>
          </div>
        </dialog>
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
                    <option value="GBP">GBP (£)</option>
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
                  <label htmlFor="new-invoice-category" className="block text-slate-400 mb-1">Service type</label>
                  <select
                    id="new-invoice-category"
                    value={newInvoice.items[0]?.category}
                    onChange={(e) => {
                      const items = [...newInvoice.items];
                      const category = e.target.value as NonNullable<Invoice['items']>[number]['category'];
                      const checkInDate = localDateString(new Date());
                      const checkOutDate = new Date();
                      checkOutDate.setDate(checkOutDate.getDate() + 1);
                      items[0] = {
                        ...items[0],
                        category,
                        check_in_date: category === 'accommodation' ? checkInDate : '',
                        check_out_date: category === 'accommodation' ? localDateString(checkOutDate) : '',
                        ...(category === 'accommodation' ? { quantity: 1 } : {}),
                      };
                      setNewInvoice({ ...newInvoice, items });
                    }}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                  >
                    {['course', 'package', 'accommodation', 'activity', 'workshop', 'training', 'gear_rental', 'shop', 'other'].map((category) => (
                      <option key={category} value={category}>{category === 'training' ? 'Training session' : category.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                {newInvoice.items[0]?.category === 'accommodation' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="new-invoice-check-in" className="block text-slate-400 mb-1">Check-in *</label>
                      <input
                        id="new-invoice-check-in"
                        type="date"
                        required
                        value={newInvoice.items[0]?.check_in_date || ''}
                        onChange={(event) => {
                          const items = [...newInvoice.items];
                          const nights = stayNights(event.target.value, items[0].check_out_date);
                          items[0] = {
                            ...items[0],
                            check_in_date: event.target.value,
                            ...(nights > 0 ? { quantity: nights } : {}),
                          };
                          setNewInvoice({ ...newInvoice, items });
                        }}
                        className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                      />
                    </div>
                    <div>
                      <label htmlFor="new-invoice-check-out" className="block text-slate-400 mb-1">Check-out *</label>
                      <input
                        id="new-invoice-check-out"
                        type="date"
                        required
                        min={newInvoice.items[0]?.check_in_date}
                        value={newInvoice.items[0]?.check_out_date || ''}
                        onChange={(event) => {
                          const items = [...newInvoice.items];
                          const nights = stayNights(items[0].check_in_date, event.target.value);
                          items[0] = {
                            ...items[0],
                            check_out_date: event.target.value,
                            ...(nights > 0 ? { quantity: nights } : {}),
                          };
                          setNewInvoice({ ...newInvoice, items });
                        }}
                        className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label htmlFor="new-invoice-description" className="block text-slate-400 mb-1">Description</label>
                  <input
                    id="new-invoice-description"
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
                    required
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {financeCategories.expense.map((category) => <option key={category} value={category}>{category}</option>)}
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
                    onChange={(e) => {
                      const currency = e.target.value;
                      const cashMethod = `Cash ${currency}`;
                      setNewExpense((current) => ({
                        ...current,
                        currency,
                        payment_method: current.payment_method.startsWith('Cash ') ? cashMethod : current.payment_method,
                        payment_account: current.payment_account.startsWith('Cash ') ? cashMethod : current.payment_account,
                      }));
                    }}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="EGP">EGP (Egyptian Pound)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="expense-payment-method" className="block text-slate-400 mb-1">Payment method *</label>
                  <select
                    id="expense-payment-method"
                    required
                    value={newExpense.payment_method}
                    onChange={(event) => setNewExpense({ ...newExpense, payment_method: event.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value={`Cash ${newExpense.currency}`}>Cash ({newExpense.currency})</option>
                    <option value="Credit Card">Credit card</option>
                    <option value="Bank Transfer">Bank transfer</option>
                    <option value="InstaPay Egypt">InstaPay Egypt</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="expense-payment-account" className="block text-slate-400 mb-1">Payment account *</label>
                  <input
                    id="expense-payment-account"
                    required
                    maxLength={100}
                    value={newExpense.payment_account}
                    onChange={(event) => setNewExpense({ ...newExpense, payment_account: event.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
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
      {selectedBill && (
        <InvoiceBillDialog
          invoice={selectedBill.invoice}
          requestId={selectedBill.requestId}
          userRole={userRole}
          onClose={() => setSelectedBill(null)}
          onSave={handleBillSave}
          onRecordPayment={handleBillPayment}
          onAdjustPayment={openAdjustmentForm}
        />
      )}
    </div>
  );
};
