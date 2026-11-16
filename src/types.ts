export type UserRole =
  | 'owner'
  | 'operations_manager'
  | 'front_desk_crm'
  | 'instructor'
  | 'finance'
  | 'hr'
  | 'equipment_manager';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  languages?: string[];
  certifications?: string[];
  hourly_rate?: number;
  session_commission?: number;
  monthly_salary?: number;
  is_active?: number;
}

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  nationality?: string;
  date_of_birth?: string;
  certification_agency?: string;
  certification_level?: string;
  total_depth_pb: number;
  static_apnea_pb?: string;
  medical_waiver_signed: number;
  medical_waiver_date?: string;
  medical_clearance_status?: 'unknown' | 'cleared' | 'physician_approved';
  medical_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_details?: string;
  source_channel?: string;
  status: 'lead' | 'inquiry' | 'active' | 'certified' | 'inactive';
  notes?: string;
  created_at: string;
}

export type StudentRegistrationInput = Pick<Student, 'first_name' | 'last_name' | 'email'> &
  Partial<Omit<Student, 'id' | 'created_at' | 'first_name' | 'last_name' | 'email' | 'medical_waiver_signed'>> & {
    medical_waiver_signed?: boolean;
  };

export type PosCatalogGroup =
  | 'Courses'
  | 'Packages'
  | 'Training'
  | 'Activities'
  | 'Accommodation'
  | 'Shop'
  | 'Gear rental';

export type PosCatalogCurrency = 'EUR' | 'EGP' | 'USD' | 'GBP';

export interface PosCatalogItem {
  id: string;
  group: PosCatalogGroup;
  name: string;
  category: CustomerRequestItemInput['category'];
  price: number | null;
  price_currency: PosCatalogCurrency | null;
  unit: string | null;
  description: string | null;
  tier_minimum_quantity: number | null;
  tier_unit_price: number | null;
  stay_discount: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PosCatalogItemInput {
  group: PosCatalogGroup;
  name: string;
  category: CustomerRequestItemInput['category'];
  price: number | null;
  price_currency: PosCatalogCurrency | null;
  unit: string | null;
  description: string | null;
  tier_minimum_quantity: number | null;
  tier_unit_price: number | null;
  stay_discount: boolean;
}

export interface Inquiry {
  id: string;
  student_id?: string;
  lead_name: string;
  lead_email?: string;
  lead_phone?: string;
  course_interest?: string;
  channel: 'WhatsApp' | 'Instagram' | 'Website' | 'Walk-in' | 'Referral';
  status: 'new' | 'contacted' | 'proposal_sent' | 'booked' | 'closed_lost';
  message?: string;
  follow_up_date?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_at: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  agency: 'AIDA' | 'Molchanovs' | 'Freedive Dahab Specialty';
  level: string;
  duration_days: number;
  max_capacity: number;
  price_eur: number;
  price_egp: number;
  description?: string;
  prerequisites?: string;
  is_active: number;
}

export interface CourseSession {
  id: string;
  course_id: string;
  course_title?: string;
  course_code?: string;
  agency?: string;
  price_eur?: number;
  price_egp?: number;
  instructor_id?: string;
  instructor_name?: string;
  start_date: string;
  end_date: string;
  location: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  max_capacity: number;
  buoy_count: number;
  prerequisites?: string;
  enrolled_count?: number;
  notes?: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  student_id: string;
  first_name?: string;
  last_name?: string;
  student_email?: string;
  student_phone?: string;
  nationality?: string;
  medical_waiver_signed?: number;
  course_id: string;
  course_title?: string;
  course_code?: string;
  session_id?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  assigned_buoy?: number | null;
  instructor_name?: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'attended' | 'certified' | 'cancelled';
  price?: number;
  currency?: string;
  payment_status?: 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
  notes?: string;
}

export interface DailyActivity {
  id: string;
  title: string;
  activity_type: string;
  location: string;
  activity_date: string;
  start_time: string;
  end_time: string;
  lead_instructor_id?: string;
  lead_instructor_name?: string;
  safety_diver_name?: string;
  max_depth_target: number;
  max_pax: number;
  current_pax: number;
  status: 'planned' | 'briefing_done' | 'in_water' | 'completed' | 'cancelled_weather';
  sea_conditions: string;
  notes?: string;
  participants?: Array<{
    id: string;
    student_id: string;
    first_name: string;
    last_name: string;
    attendance_status: string;
    depth_achieved: number;
    certification_level?: string;
  }>;
}

export interface InvoiceItem {
  id?: string;
  category?: 'course' | 'package' | 'accommodation' | 'activity' | 'workshop' | 'training' | 'gear_rental' | 'shop' | 'other';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  paid_amount?: number;
  remaining_amount?: number;
  check_in_date?: string | null;
  check_out_date?: string | null;
}

export interface InvoiceUpdateInput {
  issue_date: string;
  due_date: string;
  tax_rate: number;
  notes: string;
  items: Array<{
    category: NonNullable<InvoiceItem['category']>;
    description: string;
    quantity: number;
    unit_price: number;
    check_in_date?: string;
    check_out_date?: string;
  }>;
}

export interface AccommodationStay {
  id: string;
  description: string;
  check_in_date: string;
  check_out_date: string;
  student_id: string;
  first_name: string;
  last_name: string;
  invoice_number: string;
}

export interface FinanceOpeningBalances {
  EUR: number;
  USD: number;
  EGP: number;
  GBP: number;
}

export interface FinanceCashSummary {
  opening_balances: FinanceOpeningBalances;
  income_by_currency: FinanceOpeningBalances;
  expenses_by_currency: FinanceOpeningBalances;
  adjustments_by_currency?: FinanceOpeningBalances;
  movement_net_by_currency?: FinanceOpeningBalances;
  income_by_method_account?: Array<{ payment_method: string; payment_account: string; currency: string; total: number }>;
  expenses_by_method_account?: Array<{ payment_method: string; payment_account: string; currency: string; total: number }>;
  current_balances: FinanceOpeningBalances;
}

export interface FinanceAccountMovement {
  id: string;
  movement_type: 'transfer' | 'exchange';
  from_account: string;
  from_currency: string;
  from_amount_cents: number;
  to_account: string;
  to_currency: string;
  to_amount_cents: number;
  movement_date: string;
  reference_number?: string;
  notes?: string;
  recorded_by_name?: string;
}

export interface FinanceAccountBalance {
  account: string;
  currency: string;
  opening_balance: number;
  income: number;
  adjustments: number;
  expenses: number;
  transfers: number;
  current_balance: number;
}

export interface CustomerRequestItemInput {
  category: 'course' | 'package' | 'accommodation' | 'activity' | 'workshop' | 'training' | 'gear_rental' | 'shop' | 'other';
  description: string;
  quantity: number;
  unit_price: number;
  equipment_id?: string;
  expected_return?: string;
  check_in_date?: string;
  check_out_date?: string;
}

export interface CustomerRequest extends Invoice {
  request_id: string;
  request_number: string;
  special_request?: string;
}

export interface CustomerRequestInput {
  student_id: string;
  currency: string;
  due_date: string;
  special_request: string;
  items: CustomerRequestItemInput[];
  initial_payment: {
    amount: number;
    payment_method: string;
    payment_account: string;
    payment_date: string;
    reference_number: string;
    notes: string;
    allocations: Array<{
      item_index: number;
      beneficiary_student_id: string;
      amount: number;
    }>;
  };
}

export interface PaymentInput {
  amount: number;
  currency: string;
  customer_id: string;
  payment_method: string;
  payment_account: string;
  payment_date: string;
  reference_number: string;
  notes: string;
  allocations?: Array<{
    item_id: string;
    beneficiary_student_id: string;
    amount: number;
  }>;
}

export interface PaymentAdjustment {
  id: string;
  payment_id: string;
  adjustment_type: 'refund' | 'reversal' | 'correction';
  direction: 'debit' | 'credit';
  amount_cents: number;
  cash_amount_cents?: number | null;
  eur_amount_cents?: number | null;
  adjustment_date: string;
  payment_method: string;
  payment_account: string;
  reason: string;
  reference_number?: string;
  recorded_by_name?: string;
  allocations?: Array<{
    payment_allocation_id?: string | null;
    invoice_item_id?: string | null;
    beneficiary_student_id?: string | null;
    service_label: string;
    service_category: string;
    beneficiary_first_name?: string;
    beneficiary_last_name?: string;
    amount_cents: number;
  }>;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  currency: string;
  invoice_amount_cents?: number | null;
  eur_amount_cents?: number | null;
  exchange_rate_to_eur?: number | null;
  payment_method: string;
  payment_account?: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  recorded_by_name?: string;
  net_amount?: number;
  allocations?: Array<{
    id: string;
    invoice_item_id?: string | null;
    beneficiary_student_id?: string | null;
    service_label: string;
    service_category: string;
    beneficiary_first_name?: string;
    beneficiary_last_name?: string;
    amount_cents: number;
  }>;
  adjustments?: PaymentAdjustment[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  first_name?: string;
  last_name?: string;
  student_email?: string;
  student_phone?: string;
  booking_id?: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  customer_request_number?: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface Expense {
  id: string;
  expense_number: string;
  category: string;
  vendor_name: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_account?: string;
  expense_date: string;
  status: 'pending_approval' | 'approved' | 'paid' | 'rejected';
  approved_by_name?: string;
  description: string;
  receipt_ref?: string;
  created_by_name?: string;
}

export interface PayrollPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'submitted' | 'approved' | 'paid';
  approved_by_name?: string;
  approved_at?: string;
  notes?: string;
  staff_count?: number;
  total_gross?: number;
  total_net?: number;
}

export interface PayrollRecord {
  id: string;
  period_id: string;
  employee_id: string;
  full_name: string;
  role: string;
  email: string;
  base_salary: number;
  session_commission: number;
  sessions_taught: number;
  bonuses: number;
  deductions: number;
  gross_pay: number;
  tax_withholding: number;
  net_pay: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid';
  notes?: string;
}

export interface Equipment {
  id: string;
  barcode: string;
  item_name: string;
  category: string;
  size?: string;
  brand_model?: string;
  quantity_total: number;
  quantity_available: number;
  condition: 'new' | 'excellent' | 'good' | 'needs_service' | 'retired';
  location: string;
  last_inspected?: string;
  low_stock_threshold: number;
  notes?: string;
}

export interface EquipmentCheckout {
  id: string;
  equipment_id: string;
  item_name: string;
  size?: string;
  student_id?: string;
  student_name?: string;
  instructor_id?: string;
  checkout_time: string;
  expected_return?: string;
  condition_out: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  ip?: string;
  created_at: string;
}
