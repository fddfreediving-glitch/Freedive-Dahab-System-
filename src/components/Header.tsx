import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Language, translations } from '../i18n';
import {
  Compass,
  Clock,
  Waves,
  Shield,
  UserCheck,
  Globe,
  LogOut,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  currentUser: User | null;
  onRoleSwitch: (role: UserRole) => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onRoleSwitch,
  lang,
  onLanguageChange,
  onLogout,
}) => {
  const t = translations[lang];
  const [cairoTime, setCairoTime] = useState<string>('');
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      try {
        const timeStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(new Date());
        setCairoTime(timeStr);
      } catch {
        setCairoTime(new Date().toLocaleTimeString());
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const demoRoles: { role: UserRole; title: string; subtitle: string; color: string }[] = [
    { role: 'owner', title: t.roleOwner, subtitle: 'Full System & Audit Access', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    { role: 'operations_manager', title: t.roleOpsManager, subtitle: 'Courses, Calendar, Ops & Gear', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { role: 'front_desk_crm', title: t.roleFrontDesk, subtitle: 'Inquiries, Students & Bookings', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { role: 'instructor', title: t.roleInstructor, subtitle: 'Sessions & Assigned Student Roster', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    { role: 'finance', title: t.roleFinance, subtitle: 'Invoices, Expenses & Cashflow', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    { role: 'equipment_manager', title: t.roleEquipmentManager, subtitle: 'Gear Locker & Inspections', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#071322]/95 backdrop-blur-md border-b border-cyan-900/40 text-slate-100 shadow-lg">
      {/* Top Red Sea & Dahab Local Status Bar */}
      <div className="bg-[#040c17] px-4 py-1.5 text-xs border-b border-cyan-950/60 flex flex-wrap items-center justify-between gap-3 text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>{t.location}</span>
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dahab Time: <strong className="font-mono text-cyan-300">{cairoTime}</strong> (UTC+2)</span>
          </span>
          <span className="hidden md:flex items-center gap-2 text-slate-300">
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.waterTemp} • {t.visibility} • {t.currentWind}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={() => onLanguageChange(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800/40 transition-colors cursor-pointer text-xs font-medium"
            title="Switch Language / تبديل اللغة"
          >
            <Globe className="w-3 h-3" />
            <span>{lang === 'en' ? 'العربية (RTL)' : 'English (LTR)'}</span>
          </button>

          {/* Secure Environment Tag */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Server Auth Enforced</span>
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-900/30 ring-2 ring-cyan-400/30">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-serif">
                {t.appName}
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded">
                ERP
              </span>
            </div>
            <p className="text-xs text-cyan-200/70 font-medium">{t.appSubtitle}</p>
          </div>
        </div>

        {/* User Profile & Role Switcher Simulator */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-cyan-800/40 text-left transition-all hover:border-cyan-500/50 shadow-sm cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-cyan-700/40 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-semibold text-xs">
                {currentUser?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'FD'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  {currentUser?.full_name || 'Staff User'}
                  <Sparkles className="w-3 h-3 text-amber-400" />
                </div>
                <div className="text-[11px] text-cyan-300 uppercase tracking-wider font-mono">
                  {currentUser?.role?.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>

            {/* Dropdown Menu */}
            {roleMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-80 bg-[#0c1e36] border border-cyan-800/50 rounded-xl shadow-2xl p-2 z-50 text-slate-200"
                onClick={() => setRoleMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-cyan-900/50 mb-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-cyan-400" />
                    <span>{t.activeRoleNotice}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t.switchRolePrompt}
                  </p>
                </div>

                <div className="space-y-1">
                  {demoRoles.map((dr) => {
                    const isSelected = currentUser?.role === dr.role;
                    return (
                      <button
                        key={dr.role}
                        onClick={() => {
                          onRoleSwitch(dr.role);
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600/30 text-white font-semibold border border-cyan-500/50'
                            : 'hover:bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-white">{dr.title}</div>
                          <div className="text-[10px] text-slate-400">{dr.subtitle}</div>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-cyan-900/50 mt-2 pt-2 px-2">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
