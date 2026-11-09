import React, { useState } from 'react';
import { User, Student, CourseSession, DailyActivity, Equipment, Invoice, Inquiry } from '../types';
import { Language, translations } from '../i18n';
import { NavTab } from './Navigation';
import {
  Calendar as CalendarIcon,
  Plus,
  Info,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Anchor,
  Users,
  Receipt,
  Package,
  CheckCircle2,
  Clock,
  Compass,
} from 'lucide-react';

interface DashboardViewProps {
  currentUser: User | null;
  students: Student[];
  sessions: CourseSession[];
  activities: DailyActivity[];
  equipment: Equipment[];
  invoices: Invoice[];
  inquiries: Inquiry[];
  onNavigate: (tab: NavTab) => void;
  onOpenQuickModal: (modalType: 'student' | 'activity' | 'inquiry' | 'invoice' | 'gear') => void;
  lang: Language;
  theme: 'light' | 'dark';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  students,
  sessions,
  activities,
  equipment,
  invoices,
  inquiries,
  onNavigate,
  onOpenQuickModal,
  lang,
  theme,
}) => {
  const t = translations[lang];
  const isDark = theme === 'dark';
  const role = currentUser?.role || 'owner';
  const canSeeFinance = ['owner', 'finance'].includes(role);

  // Timeframe selector on the main chart
  const [chartTimeframe, setChartTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [chartFilter, setChartFilter] = useState<'trial' | 'all' | 'certified'>('trial');
  const [activityReportType, setActivityReportType] = useState<'crm' | 'ocean'>('crm');

  // Computed values
  const totalStudents = students.length || 28;
  const activeStudents = students.filter((s) => s.status === 'active').length || 18;
  const totalInquiries = inquiries.length || 148;
  const paidInvoicesTotal = invoices
    .filter((i) => i.status === 'paid' || i.status === 'issued')
    .reduce((sum, inv) => sum + (inv.paid_amount || inv.total_amount), 0);
  const totalRevenueDisplay = paidInvoicesTotal > 0 ? paidInvoicesTotal.toLocaleString() : '1,200';
  const netRevenueDisplay = paidInvoicesTotal > 0 ? Math.round(paidInvoicesTotal * 0.45).toLocaleString() : '538';

  // SVG Chart Dimensions
  const chartPoints = [
    { label: '2 Feb', value: 12, x: 50, y: 170 },
    { label: '3 Feb', value: 16, x: 170, y: 155 },
    { label: '4 Feb', value: 15, x: 290, y: 160 },
    { label: '5 Feb', value: 21, x: 410, y: 110, highlight: true },
    { label: '6 Feb', value: 28, x: 530, y: 80 },
    { label: '7 Feb', value: 22, x: 650, y: 105 },
    { label: '8 Feb', value: 34, x: 770, y: 60 },
  ];

  // SVG cubic curve path generator
  const svgPath = 'M 50 170 C 110 170, 110 155, 170 155 C 230 155, 230 160, 290 160 C 350 160, 350 110, 410 110 C 470 110, 470 80, 530 80 C 590 80, 590 105, 650 105 C 710 105, 710 60, 770 60';
  const svgAreaPath = `${svgPath} L 770 200 L 50 200 Z`;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Bar matching reference: "Sales Dashboard" + Date Filters + "+ ADD REPORT" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#28334E] dark:text-white tracking-tight">
            Sales Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Freedive Dahab student acquisition, Red Sea training sessions & revenue overview.
          </p>
        </div>

        {/* Date Filters & Primary Action Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer hover:border-[#4C8BF5] transition-colors">
            <span>1 FEB</span>
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer hover:border-[#4C8BF5] transition-colors">
            <span>29 FEB</span>
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={() => onOpenQuickModal('student')}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/25 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>ADD REPORT</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. 4 Metric KPI Cards matching 1:1 the reference picture */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: New Users */}
        <div
          onClick={() => onNavigate('students_crm')}
          className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] cursor-pointer hover:border-[#4C8BF5]/60 transition-all group"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>New Users</span>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="text-4xl font-extrabold text-[#28334E] dark:text-white tracking-tight mt-2 mb-1.5 font-sans">
            {totalStudents}
          </div>

          <div className="flex items-center text-xs">
            <span className="font-bold text-emerald-500 flex items-center gap-0.5">
              +17% <TrendingUp className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5 truncate">
              Overviewed of last month
            </span>
          </div>
        </div>

        {/* Card 2: Churn rate, % */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Churn rate, %</span>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="text-4xl font-extrabold text-[#28334E] dark:text-white tracking-tight mt-2 mb-1.5 font-sans">
            4,1
          </div>

          <div className="flex items-center text-xs">
            <span className="font-bold text-rose-500 flex items-center gap-0.5">
              -1,3% <TrendingDown className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5 truncate">
              Overviewed of last month
            </span>
          </div>
        </div>

        {/* Card 3: Total Revenue, $ */}
        <div
          onClick={() => onNavigate('finance')}
          className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] cursor-pointer hover:border-[#4C8BF5]/60 transition-all group"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Total Revenue, €</span>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="text-4xl font-extrabold text-[#28334E] dark:text-white tracking-tight mt-2 mb-1.5 font-sans">
            {totalRevenueDisplay}
          </div>

          <div className="flex items-center text-xs">
            <span className="font-bold text-emerald-500 flex items-center gap-0.5">
              +13% <TrendingUp className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5 truncate">
              last month
            </span>
          </div>
        </div>

        {/* Card 4: Net Revenue, $ */}
        <div
          onClick={() => onNavigate('finance')}
          className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] cursor-pointer hover:border-[#4C8BF5]/60 transition-all group"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Net Revenue, €</span>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="text-4xl font-extrabold text-[#28334E] dark:text-white tracking-tight mt-2 mb-1.5 font-sans">
            {netRevenueDisplay}
          </div>

          <div className="flex items-center text-xs">
            <span className="font-bold text-emerald-500 flex items-center gap-0.5">
              +17% <TrendingUp className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5 truncate">
              last month
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Chart Card: "Lead Contacts ⓘ" with Bezier Curve + Floating Tooltip */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)]">
        {/* Card Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#28334E] dark:text-white">
                Lead Contacts
              </h2>
              <Info className="w-3.5 h-3.5 text-slate-400" />

              {/* Course / Lead filter dropdown pill */}
              <div className="relative inline-block ml-1">
                <select
                  value={chartFilter}
                  onChange={(e) => setChartFilter(e.target.value as any)}
                  className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 pr-6 appearance-none cursor-pointer focus:outline-none focus:border-[#4C8BF5]"
                >
                  <option value="trial">Trial</option>
                  <option value="all">All Courses</option>
                  <option value="certified">AIDA Freedivers</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Data range: All time
            </p>
          </div>

          {/* Timeframe Buttons: DAY | WEEK | MONTH */}
          <div className="flex items-center gap-1 bg-[#F8FAFC] dark:bg-slate-800 p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-700">
            {(['day', 'week', 'month'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setChartTimeframe(tf)}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  chartTimeframe === tf
                    ? 'bg-[#EAF2FE] dark:bg-blue-950/70 text-[#4C8BF5] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Interactive Chart with floating Tooltip */}
        <div className="relative pt-6 pb-2 overflow-x-auto no-scrollbar">
          <div className="min-w-[680px] h-64 relative">
            {/* Horizontal Grid lines with Y-Axis */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 dark:text-slate-500">
              <div className="flex items-center gap-3">
                <span className="w-6 text-right">40</span>
                <div className="flex-1 border-b border-slate-100 dark:border-slate-800/80" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 text-right">30</span>
                <div className="flex-1 border-b border-slate-100 dark:border-slate-800/80" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 text-right">20</span>
                <div className="flex-1 border-b border-slate-100 dark:border-slate-800/80" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 text-right">10</span>
                <div className="flex-1 border-b border-slate-100 dark:border-slate-800/80" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-6 text-right">0</span>
                <div className="flex-1 border-b border-slate-200 dark:border-slate-700" />
              </div>
            </div>

            {/* SVG Wave */}
            <svg
              viewBox="0 0 820 220"
              className="absolute inset-0 w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chart_grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4C8BF5" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#4C8BF5" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gradient Area under curve */}
              <path d={svgAreaPath} fill="url(#chart_grad)" />

              {/* Curved Line */}
              <path
                d={svgPath}
                fill="none"
                stroke="#4C8BF5"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data Point Dots */}
              {chartPoints.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.highlight ? 6 : 4}
                  className="fill-[#4C8BF5] stroke-white stroke-2 cursor-pointer transition-transform hover:scale-125"
                />
              ))}

              {/* Dashed vertical indicator line at 5 Feb */}
              <line
                x1="410"
                y1="110"
                x2="410"
                y2="200"
                stroke="#4C8BF5"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.4"
              />
            </svg>

            {/* Floating Tooltip matching Reference Picture: "5 February 2020 | LEAD Trial | 21 +15% ↑" */}
            <div
              className="absolute z-20 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
              style={{ left: '50%', top: '35%' }}
            >
              <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium">
                5 February 2026
              </div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 text-center uppercase tracking-wider mt-0.5">
                LEAD Trial
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className="text-xl font-extrabold text-[#28334E] dark:text-white">
                  21
                </span>
                <span className="text-[11px] font-bold text-emerald-500 flex items-center">
                  +15% <TrendingUp className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </div>

            {/* X-Axis Dates matching Reference Picture */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-10 text-[11px] text-slate-400 dark:text-slate-500 font-medium pt-2">
              <span>2 Feb</span>
              <span>3 Feb</span>
              <span>4 Feb</span>
              <span>5 Feb</span>
              <span>6 Feb</span>
              <span>7 Feb</span>
              <span>8 Feb</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Row (2 Cards in 2 Columns matching Reference Picture) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Booked Trial Report ⓘ (Horizontal Bar Chart) */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-extrabold text-[#28334E] dark:text-white">
                Booked Trial Report
              </h3>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 mb-6">
              Data range: All time
            </p>

            {/* Horizontal Bar Chart */}
            <div className="space-y-4">
              {[
                { label: 'Manager 1', value: 9, max: 10, count: 9 },
                { label: 'Manager 2', value: 8.2, max: 10, count: 8 },
                { label: 'Manager 3', value: 3.8, max: 10, count: 4 },
              ].map((mgr, idx) => (
                <div key={idx} className="flex items-center gap-4 text-xs">
                  <span className="w-20 text-slate-500 dark:text-slate-400 text-right text-[11px] font-medium shrink-0">
                    {mgr.label}
                  </span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800/80 rounded-r-lg h-7 relative flex items-center overflow-hidden">
                    {/* Vertical grid lines */}
                    <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <div key={n} className="border-r border-slate-400 h-full" />
                      ))}
                    </div>

                    <div
                      className="h-full bg-[#93C5FD] dark:bg-blue-500/80 rounded-r-lg transition-all duration-700 flex items-center justify-end pr-2 font-bold text-[11px] text-blue-950"
                      style={{ width: `${(mgr.value / mgr.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* X-Axis Numbers Scale: 0 to 10 */}
            <div className="flex justify-between pl-24 pr-1 text-[10px] text-slate-400 mt-3 font-mono">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            Count of Contacts
          </div>
        </div>

        {/* Right Card: Productivity Report ⓘ (Activity Table) */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-extrabold text-[#28334E] dark:text-white">
                  Productivity Report
                </h3>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* View switch button */}
              <button
                onClick={() => setActivityReportType(activityReportType === 'crm' ? 'ocean' : 'crm')}
                className="text-[11px] font-semibold text-[#4C8BF5] hover:underline cursor-pointer"
              >
                {activityReportType === 'crm' ? 'Show Ocean Tasks ▾' : 'Show CRM Tasks ▾'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">
              Data range: In the last 30 days
            </p>

            {/* Table matching reference */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 text-left font-bold text-[#4C8BF5]">ACTIVITY TYPE</th>
                    <th className="py-2.5 text-right font-bold text-slate-400">
                      COUNT OF ACTIVITIES
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {activityReportType === 'crm' ? (
                    <>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium">
                          Email sent to contact
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          254
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium">
                          Task
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          73
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium">
                          Call
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          12
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium">
                          Meeting
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          8
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium">
                          Note
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          124
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
                          <Anchor className="w-3.5 h-3.5 text-cyan-500" />
                          <span>Blue Hole Depth Dives</span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          48
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>AIDA Certifications Checked</span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          32
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Carbon Fins & Gear Checkouts</span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          65
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
                          <Receipt className="w-3.5 h-3.5 text-amber-500" />
                          <span>Invoices Reconciled</span>
                        </td>
                        <td className="py-2.5 text-right font-bold text-[#28334E] dark:text-white font-mono">
                          19
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
            <span>Red Sea Operations Feed</span>
            <button
              onClick={() => onNavigate('daily_ops')}
              className="text-[#4C8BF5] hover:underline font-semibold cursor-pointer"
            >
              Open Daily Ops Board →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
