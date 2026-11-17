import React, { useState } from 'react';
import { ArrowLeft, Check, UserRoundPlus } from 'lucide-react';
import type { StudentRegistrationInput, UserRole } from '../types';

interface StudentRegistrationPageProps {
  userRole: UserRole;
  onRegister: (student: StudentRegistrationInput) => Promise<void>;
  onCancel: () => void;
}

interface RegistrationFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  arrival_date: string;
  departure_date: string;
  needs_accommodation: boolean;
  needs_airport_transfer: boolean;
  nationality: string;
  date_of_birth: string;
  certification_agency: string;
  certification_level: string;
  total_depth_pb: string;
  static_apnea_pb: string;
  medical_waiver_signed: boolean;
  medical_waiver_date: string;
  medical_clearance_status: NonNullable<StudentRegistrationInput['medical_clearance_status']>;
  medical_notes: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  insurance_details: string;
  source_channel: NonNullable<StudentRegistrationInput['source_channel']>;
  status: NonNullable<StudentRegistrationInput['status']>;
  notes: string;
}

const initialForm = (): RegistrationFormState => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  whatsapp: '',
  arrival_date: '',
  departure_date: '',
  needs_accommodation: false,
  needs_airport_transfer: false,
  nationality: '',
  date_of_birth: '',
  certification_agency: '',
  certification_level: '',
  total_depth_pb: '',
  static_apnea_pb: '',
  medical_waiver_signed: false,
  medical_waiver_date: '',
  medical_clearance_status: 'unknown',
  medical_notes: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  insurance_details: '',
  source_channel: 'Walk-in',
  status: 'lead',
  notes: '',
});

const inputClass = 'min-h-11 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300';

export const StudentRegistrationPage: React.FC<StudentRegistrationPageProps> = ({ userRole, onRegister, onCancel }) => {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canRecordMedicalNotes = ['owner', 'operations_manager', 'hr'].includes(userRole);
  const canRecordClearance = canRecordMedicalNotes;
  const canRecordWaiver = ['owner', 'operations_manager', 'front_desk_crm', 'hr'].includes(userRole);

  const update = <Key extends keyof RegistrationFormState>(key: Key, value: RegistrationFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onRegister({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        whatsapp: form.whatsapp.trim() || undefined,
        arrival_date: form.arrival_date || undefined,
        departure_date: form.departure_date || undefined,
        needs_accommodation: form.needs_accommodation ? 1 : 0,
        needs_airport_transfer: form.needs_airport_transfer ? 1 : 0,
        nationality: form.nationality.trim() || undefined,
        date_of_birth: form.date_of_birth || undefined,
        certification_agency: form.certification_agency.trim() || 'None',
        certification_level: form.certification_level.trim() || 'Beginner',
        total_depth_pb: form.total_depth_pb ? Number(form.total_depth_pb) : 0,
        static_apnea_pb: form.static_apnea_pb.trim() || undefined,
        medical_waiver_signed: form.medical_waiver_signed,
        medical_waiver_date: form.medical_waiver_signed ? form.medical_waiver_date : undefined,
        ...(canRecordClearance ? { medical_clearance_status: form.medical_clearance_status } : {}),
        ...(canRecordMedicalNotes ? { medical_notes: form.medical_notes.trim() || undefined } : {}),
        emergency_contact_name: form.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
        insurance_details: form.insurance_details.trim() || undefined,
        source_channel: form.source_channel,
        status: form.status,
        notes: form.notes.trim() || undefined,
      });
      await onCancel();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'The student could not be registered.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-[#E8EEF7] pb-5 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#28334E] dark:text-white">Register a student</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Capture contact, freediving, safety, and emergency details in one place. New registrations start as leads.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:self-auto">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to contacts
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section aria-labelledby="registration-personal-heading" className="space-y-4 rounded-2xl border border-[#E8EEF7] bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B] sm:p-6">
          <div>
            <h2 id="registration-personal-heading" className="text-lg font-bold text-[#28334E] dark:text-white">Personal details</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Use the student’s preferred name and contact details.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="registration-first-name" className={labelClass}>First name *</label>
              <input id="registration-first-name" autoFocus required maxLength={100} value={form.first_name} onChange={(event) => update('first_name', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-last-name" className={labelClass}>Last name *</label>
              <input id="registration-last-name" required maxLength={100} value={form.last_name} onChange={(event) => update('last_name', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-status" className={labelClass}>Student status *</label>
              <select id="registration-status" value={form.status} onChange={(event) => update('status', event.target.value as RegistrationFormState['status'])} className={inputClass}>
                <option value="lead">Lead</option>
                <option value="inquiry">Inquiry</option>
                <option value="active">Active</option>
                <option value="certified">Certified</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label htmlFor="registration-email" className={labelClass}>Email address *</label>
              <input id="registration-email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(event) => update('email', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-phone" className={labelClass}>Phone number</label>
              <input id="registration-phone" type="tel" autoComplete="tel" maxLength={60} value={form.phone} onChange={(event) => update('phone', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-nationality" className={labelClass}>Nationality</label>
              <input id="registration-nationality" autoComplete="country-name" maxLength={80} value={form.nationality} onChange={(event) => update('nationality', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-date-of-birth" className={labelClass}>Date of birth</label>
              <input id="registration-date-of-birth" type="date" max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} onChange={(event) => update('date_of_birth', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-source" className={labelClass}>How did they find us?</label>
              <select id="registration-source" value={form.source_channel} onChange={(event) => update('source_channel', event.target.value as RegistrationFormState['source_channel'])} className={inputClass}>
                {['Website', 'Instagram', 'WhatsApp', 'Walk-in', 'Referral'].map((source) => <option key={source} value={source}>{source}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section aria-labelledby="registration-stay-heading" className="space-y-4 rounded-2xl border border-[#E8EEF7] bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B] sm:p-6">
          <div>
            <h2 id="registration-stay-heading" className="text-lg font-bold text-[#28334E] dark:text-white">Trip &amp; stay</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Arrival and check-out drive airport transfers, room allocation and the activity plan. Check-out cannot be before arrival.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="registration-whatsapp" className={labelClass}>WhatsApp number</label>
              <input id="registration-whatsapp" type="tel" inputMode="tel" autoComplete="tel" maxLength={60} placeholder="+20 100 000 0000" value={form.whatsapp} onChange={(event) => update('whatsapp', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-arrival" className={labelClass}>Arrival date</label>
              <input id="registration-arrival" type="date" value={form.arrival_date} onChange={(event) => update('arrival_date', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-departure" className={labelClass}>Check-out date</label>
              <input id="registration-departure" type="date" min={form.arrival_date || undefined} value={form.departure_date} onChange={(event) => update('departure_date', event.target.value)} className={inputClass} />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.needs_accommodation} onChange={(event) => update('needs_accommodation', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#4C8BF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5]" />
              Needs accommodation
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={form.needs_airport_transfer} onChange={(event) => update('needs_airport_transfer', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#4C8BF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5]" />
              Airport pickup
            </label>
          </div>
        </section>

        <section aria-labelledby="registration-diving-heading" className="space-y-4 rounded-2xl border border-[#E8EEF7] bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B] sm:p-6">
          <div>
            <h2 id="registration-diving-heading" className="text-lg font-bold text-[#28334E] dark:text-white">Freediving profile</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Prior certifications and personal bests help staff recommend the right session.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="registration-agency" className={labelClass}>Certification agency</label>
              <input id="registration-agency" maxLength={100} placeholder="SSI, or a prior agency" value={form.certification_agency} onChange={(event) => update('certification_agency', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-level" className={labelClass}>Certification level</label>
              <input id="registration-level" maxLength={100} placeholder="Beginner, Level 1, Level 2…" value={form.certification_level} onChange={(event) => update('certification_level', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-depth" className={labelClass}>Personal best depth (metres)</label>
              <input id="registration-depth" type="number" min="0" max="200" step="0.1" value={form.total_depth_pb} onChange={(event) => update('total_depth_pb', event.target.value)} className={`${inputClass} font-data`} />
            </div>
            <div>
              <label htmlFor="registration-static" className={labelClass}>Static apnea best (MM:SS)</label>
              <input id="registration-static" inputMode="numeric" pattern="[0-9]{2}:[0-5][0-9]" placeholder="04:15" value={form.static_apnea_pb} onChange={(event) => update('static_apnea_pb', event.target.value)} className={`${inputClass} font-data`} />
            </div>
          </div>
        </section>

        <section aria-labelledby="registration-safety-heading" className="space-y-4 rounded-2xl border border-[#E8EEF7] bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B] sm:p-6">
          <div>
            <h2 id="registration-safety-heading" className="text-lg font-bold text-[#28334E] dark:text-white">Safety and emergency information</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">Waiver and medical information is access-controlled. A signed waiver must include its signature date.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {canRecordWaiver && (
              <div className="space-y-3">
                <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.medical_waiver_signed} onChange={(event) => update('medical_waiver_signed', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#4C8BF5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5]" />
                  Signed waiver is already on file
                </label>
                {form.medical_waiver_signed && (
                  <div>
                    <label htmlFor="registration-waiver-date" className={labelClass}>Waiver signature date *</label>
                    <input id="registration-waiver-date" type="date" required max={new Date().toISOString().slice(0, 10)} value={form.medical_waiver_date} onChange={(event) => update('medical_waiver_date', event.target.value)} className={inputClass} />
                  </div>
                )}
              </div>
            )}
            {canRecordClearance && (
              <div>
                <label htmlFor="registration-clearance" className={labelClass}>Medical clearance</label>
                <select id="registration-clearance" value={form.medical_clearance_status} onChange={(event) => update('medical_clearance_status', event.target.value as RegistrationFormState['medical_clearance_status'])} className={inputClass}>
                  <option value="unknown">Unknown / not reviewed</option>
                  <option value="cleared">Cleared</option>
                  <option value="physician_approved">Physician approved</option>
                </select>
              </div>
            )}
            {canRecordMedicalNotes && (
              <div className="sm:col-span-2">
                <label htmlFor="registration-medical-notes" className={labelClass}>Restricted medical notes</label>
                <textarea id="registration-medical-notes" rows={3} maxLength={2000} value={form.medical_notes} onChange={(event) => update('medical_notes', event.target.value)} className={`${inputClass} py-2`} />
              </div>
            )}
            <div>
              <label htmlFor="registration-emergency-name" className={labelClass}>Emergency contact name</label>
              <input id="registration-emergency-name" autoComplete="off" maxLength={120} value={form.emergency_contact_name} onChange={(event) => update('emergency_contact_name', event.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="registration-emergency-phone" className={labelClass}>Emergency contact phone</label>
              <input id="registration-emergency-phone" type="tel" maxLength={60} value={form.emergency_contact_phone} onChange={(event) => update('emergency_contact_phone', event.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="registration-insurance" className={labelClass}>Insurance details</label>
              <textarea id="registration-insurance" rows={2} maxLength={1000} value={form.insurance_details} onChange={(event) => update('insurance_details', event.target.value)} className={`${inputClass} py-2`} />
            </div>
          </div>
        </section>

        <section aria-labelledby="registration-notes-heading" className="space-y-4 rounded-2xl border border-[#E8EEF7] bg-white p-4 dark:border-slate-800 dark:bg-[#1E293B] sm:p-6">
          <div>
            <h2 id="registration-notes-heading" className="text-lg font-bold text-[#28334E] dark:text-white">Staff notes</h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Keep general preferences and follow-up context here; do not enter restricted medical information.</p>
          </div>
          <textarea aria-label="General student notes" rows={4} maxLength={4000} value={form.notes} onChange={(event) => update('notes', event.target.value)} className={`${inputClass} py-2`} />
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-[#E8EEF7] pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={submitting} className="min-h-11 rounded-lg border border-[#E2E8F0] px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#4C8BF5] disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
          <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4C8BF5] px-5 text-sm font-semibold text-white hover:bg-[#3B7BE8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4C8BF5] disabled:opacity-50">
            {submitting ? <span>Saving registration…</span> : <><UserRoundPlus className="h-4 w-4" aria-hidden="true" /> Save student</>}
          </button>
        </div>
      </form>
    </div>
  );
};
