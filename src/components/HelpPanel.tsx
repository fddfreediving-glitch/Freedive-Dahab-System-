import React, { useState } from 'react';
import {
  X,
  LifeBuoy,
  Phone,
  CheckCircle2,
  ChevronDown,
  Shield,
  UserCog,
  ConciergeBell,
  GraduationCap,
  Calculator,
  Users,
  Wrench,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Search,
} from 'lucide-react';

interface HelpPanelProps {
  currentUser: { full_name: string; email: string; role: string } | null;
  onClose: () => void;
}

const EMERGENCY_NUMBERS = [
  { label: 'Hyperbaric Chamber', value: '+20 69 364 0530' },
  { label: 'Dahab Ambulance', value: '123' },
  { label: 'Tourism Police', value: '126' },
  { label: 'Blue Hole Station', value: 'VHF Channel 16' },
];

const ONBOARDING_STEPS = [
  'Sign in with your staff email and password on the login screen.',
  'Open the Daily Dashboard to see today\'s sessions, activities and alerts.',
  'Go to Customers and register a new customer with contact details and WhatsApp number.',
  'Open Point of Sale, pick the customer, add course or package items and create a customer request with a deposit.',
  'Record the deposit payment in Daily Finance so the invoice shows partially paid.',
];

const ROLE_GUIDES: Array<{ role: string; icon: React.ComponentType<{ className?: string }>; bullets: string[] }> = [
  {
    role: 'Owner',
    icon: Shield,
    bullets: [
      'Review the whole business from Daily Dashboard, then approve payroll in Payroll and check Security Audit for every sensitive change.',
      'Adjust booking safety gates, currencies and staff roles in Settings — every change is audit-logged.',
      'Use Reports (in the Daily Finance view) for monthly revenue, expenses and cash position.',
      'Export a full JSON backup from Settings → Data & Backup at the end of each month.',
    ],
  },
  {
    role: 'Operations Manager',
    icon: UserCog,
    bullets: [
      'Plan the week in Planner and Courses: schedule sessions, assign instructors and set buoy counts.',
      'Run the Daily Planner (Tasks) ocean board: briefings, in-water status, sea conditions.',
      'Create and edit bookings in Courses; the safety gate blocks expired waivers and low deposits automatically.',
      'Manage equipment together with the Equipment Manager in Equipment.',
    ],
  },
  {
    role: 'Front Desk / CRM',
    icon: ConciergeBell,
    bullets: [
      'Register walk-ins and WhatsApp leads in Customers, and keep inquiry statuses up to date.',
      'Create customer requests and take deposits in Point of Sale.',
      'Check arriving customers\' waivers and accommodation needs in Customers before their start date.',
      'Daily Dashboard shows who is arriving, in training or checking out today.',
    ],
  },
  {
    role: 'Instructor',
    icon: GraduationCap,
    bullets: [
      'See your sessions and ocean activities for the day in Daily Dashboard and Daily Planner (Tasks).',
      'Update activity status (briefing done, in water, completed) and log participant depths in Daily Planner.',
      'Check your roster and buoy assignment in Courses before entering the water.',
      'Request gear for students from the Equipment board; medical notes stay restricted to authorized roles.',
    ],
  },
  {
    role: 'Finance',
    icon: Calculator,
    bullets: [
      'Issue and edit invoices, record payments and refunds in Daily Finance.',
      'Always set the day\'s EUR exchange rate when recording EGP or USD payments — totals stay accurate.',
      'Log supplier bills as expenses and reconcile cash accounts in Daily Finance.',
      'Use Reports for income by category and outstanding balances.',
    ],
  },
  {
    role: 'HR',
    icon: Users,
    bullets: [
      'Manage staff accounts, contracts and certifications in Staff (together with the owner).',
      'Prepare payroll periods in Payroll and submit them for owner approval.',
      'Medical clearance and confidential notes are visible to HR, owner and operations only — keep them that way.',
    ],
  },
  {
    role: 'Equipment Manager',
    icon: Wrench,
    bullets: [
      'Track wetsuits, fins, buoys and safety oxygen in Equipment with low-stock thresholds.',
      'Handle checkouts and returns; condition checks protect both students and the center.',
      'Flag gear as "needs service" so unsafe equipment is pulled from the available count.',
    ],
  },
];

const TROUBLESHOOTING: Array<{ title: string; body: string }> = [
  {
    title: 'I cannot sign in',
    body: 'If you see "server is not reachable", the ERP server or internet connection is down — try again in a minute or contact the owner. If it says "invalid email or password", check caps lock and use the exact staff email. Repeated failures are logged in Security Audit.',
  },
  {
    title: 'A customer is missing from the list',
    body: 'Open Customers and clear the status filter — the list may be showing only "active" customers while the person is still a lead or inquiry. Search by last name or WhatsApp number.',
  },
  {
    title: 'A booking is blocked by safety rules',
    body: 'The server enforces four gates: a waiver signed within the validity window, medical clearance recorded, a deposit of at least the configured percentage, and a free buoy slot (Ras Mohamed trips also need the minimum group size). Fix the missing item in Customers, then retry the booking in Courses.',
  },
  {
    title: 'An invoice total is wrong',
    body: 'Edit the invoice in Daily Finance before recording more payments: adjust line items while the invoice is still draft or partially paid. Payments already recorded stay in the audit log and are corrected with adjustments, never deleted.',
  },
  {
    title: 'An exchange rate is missing',
    body: 'Rates to EUR are set when recording the payment. If the rate field is empty, ask the owner or finance to update today\'s rates in Settings → Currency & Exchange Rates, then record the payment again.',
  },
  {
    title: 'Dark mode or contrast issues',
    body: 'Use the theme toggle in the top navbar. Every screen supports light and dark mode; if text is hard to read on an older screen, switch themes or raise brightness — colors are fixed to the brand palette.',
  },
  {
    title: 'Worried about losing data',
    body: 'The database is a transactional SQLite file with write-ahead logging. The owner can export a complete JSON snapshot anytime from Settings → Data & Backup, and download the audit log as CSV for compliance.',
  },
];

const FAQ: Array<{ question: string; answer: string }> = [
  {
    question: 'How much deposit should a customer pay?',
    answer: 'The server enforces the minimum deposit percentage configured in Settings → Booking & Safety Rules (30% by default). You can always collect more — for example the full Training Week price in high season — but never less.',
  },
  {
    question: 'Which WhatsApp number should we use with customers?',
    answer: 'Register each customer\'s own WhatsApp number in their Customers profile so follow-ups and arrival coordination reach them. The center\'s WhatsApp Business number lives in Settings → Business Profile and is used for outgoing messages.',
  },
  {
    question: 'Do we sell courses from other agencies?',
    answer: 'No. The catalogue is SSI only, plus Freedive Dahab specialty workshops. Customers may arrive with certifications from other agencies — record that in their profile — but the center only sells and certifies SSI programs.',
  },
  {
    question: 'How do seasons affect pricing?',
    answer: 'Low season runs 1 December to 31 March, high season 1 April to 30 November. Accommodation and package prices differ between seasons in the POS catalogue — always quote the correct season price and never average the two.',
  },
  {
    question: 'Can I delete a wrong payment?',
    answer: 'No. Payments are append-only for audit integrity. Record a refund or reversal adjustment in Daily Finance instead; the correction is linked to the original receipt.',
  },
  {
    question: 'Who can see medical and waiver information?',
    answer: 'Only the owner, operations manager and HR can see medical notes and clearance details. Instructors see that a waiver is signed without the sensitive details.',
  },
  {
    question: 'What happens when the internet goes down in Dahab?',
    answer: 'The ERP needs the local server to run. The database file stays safe on disk; once the server is back, sign in again and everything is still there. Use the phone emergency numbers above for anything safety-critical.',
  },
];

function AccordionItem({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#E8EEF7] dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#1E293B]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left cursor-pointer hover:bg-[#F4F6FA] dark:hover:bg-slate-800/60 transition-colors"
      >
        <Icon className="w-4 h-4 text-[#4C8BF5] shrink-0" />
        <span className="flex-1 text-xs font-bold text-[#28334E] dark:text-white">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 border-t border-[#E8EEF7] dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ currentUser, onClose }) => {
  const [openTroubleshooting, setOpenTroubleshooting] = useState<string | null>(TROUBLESHOOTING[0]?.title ?? null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();
  const troubleshootingResults = normalizedQuery
    ? TROUBLESHOOTING.filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(normalizedQuery))
    : TROUBLESHOOTING;
  const faqResults = normalizedQuery
    ? FAQ.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(normalizedQuery))
    : FAQ;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
        className="bg-[#F4F6FA] dark:bg-[#0F172A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-[#1E293B] border-b border-[#E8EEF7] dark:border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <LifeBuoy className="w-5 h-5 text-[#4C8BF5]" />
            <h2 id="help-panel-title" className="font-extrabold text-[#28334E] dark:text-white text-base">
              Freedive Dahab Help &amp; Guidance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help panel"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Ask a question */}
          <div>
            <label htmlFor="help-search" className="mb-1.5 block text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Ask a question about the system
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
              <input
                id="help-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder='Try "deposit", "booking blocked", "exchange rate", "sign in"...'
                className="w-full rounded-xl border border-[#E8EEF7] dark:border-slate-700 bg-white dark:bg-[#1E293B] py-2.5 pl-9 pr-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#4C8BF5]"
              />
            </div>
            {normalizedQuery && troubleshootingResults.length === 0 && faqResults.length === 0 && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                No built-in answer matches &quot;{query.trim()}&quot;. Try different words, or ask the owner — sensitive changes are listed in Security Audit.
              </p>
            )}
          </div>
          {/* Emergency strip */}
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900">
            <div className="font-extrabold text-rose-800 dark:text-rose-300 flex items-center gap-2 text-xs uppercase tracking-wider mb-2.5">
              <Phone className="w-4 h-4" />
              <span>Emergency — Dahab</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              {EMERGENCY_NUMBERS.map((entry) => (
                <div key={entry.label}>
                  <span className="text-rose-500 dark:text-rose-400 block">{entry.label}</span>
                  <strong className="text-rose-900 dark:text-rose-200">{entry.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Onboarding checklist */}
          <section aria-labelledby="help-onboarding-heading">
            <h3 id="help-onboarding-heading" className="text-sm font-extrabold text-[#28334E] dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Start here in 5 minutes
            </h3>
            <ol className="space-y-2">
              {ONBOARDING_STEPS.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 rounded-2xl px-4 py-2.5 text-[11px] text-slate-600 dark:text-slate-300"
                >
                  <span className="w-5 h-5 rounded-full bg-[#4C8BF5] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Per-role quick guides */}
          <section aria-labelledby="help-roles-heading">
            <h3 id="help-roles-heading" className="text-sm font-extrabold text-[#28334E] dark:text-white mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#4C8BF5]" />
              Quick guide for your role
            </h3>
            {currentUser && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                You are signed in as <strong className="text-slate-700 dark:text-slate-200">{currentUser.full_name}</strong>{' '}
                <span className="font-mono uppercase text-[#4C8BF5] font-bold">({currentUser.role.replace(/_/g, ' ')})</span>.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_GUIDES.map((guide) => (
                <div
                  key={guide.role}
                  className={`bg-white dark:bg-[#1E293B] border rounded-2xl p-4 ${
                    currentUser?.role.replace(/_/g, ' ').toLowerCase() === guide.role.toLowerCase()
                      ? 'border-[#4C8BF5] shadow-md shadow-blue-500/10'
                      : 'border-[#E8EEF7] dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <guide.icon className="w-4 h-4 text-[#4C8BF5]" />
                    <h4 className="text-xs font-extrabold text-[#28334E] dark:text-white">{guide.role}</h4>
                  </div>
                  <ul className="space-y-1.5">
                    {guide.bullets.map((bullet, index) => (
                      <li key={index} className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#4C8BF5] mt-1.5 shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Troubleshooting accordion */}
          <section aria-labelledby="help-troubleshooting-heading">
            <h3 id="help-troubleshooting-heading" className="text-sm font-extrabold text-[#28334E] dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Fix it fast
            </h3>
            <div className="space-y-2">
              {troubleshootingResults.map((item) => (
                <AccordionItem
                  key={item.title}
                  title={item.title}
                  icon={Lightbulb}
                  expanded={Boolean(normalizedQuery) || openTroubleshooting === item.title}
                  onToggle={() => setOpenTroubleshooting(openTroubleshooting === item.title ? null : item.title)}
                >
                  {item.body}
                </AccordionItem>
              ))}
            </div>
          </section>

          {/* FAQ accordion */}
          <section aria-labelledby="help-faq-heading">
            <h3 id="help-faq-heading" className="text-sm font-extrabold text-[#28334E] dark:text-white mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#4C8BF5]" />
              Frequently asked questions
            </h3>
            <div className="space-y-2">
              {faqResults.map((item) => (
                <AccordionItem
                  key={item.question}
                  title={item.question}
                  icon={HelpCircle}
                  expanded={Boolean(normalizedQuery) || openFaq === item.question}
                  onToggle={() => setOpenFaq(openFaq === item.question ? null : item.question)}
                >
                  {item.answer}
                </AccordionItem>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="pt-3 border-t border-[#E8EEF7] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Freedive Dahab Operations &amp; CRM ERP — internal use only
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 cursor-pointer transition-colors"
            >
              Close Help
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
