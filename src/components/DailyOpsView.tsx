import React, { useState } from 'react';
import { DailyActivity, Student, User, UserRole } from '../types';
import { Language, translations } from '../i18n';
import {
  Anchor,
  Clock,
  Compass,
  Plus,
  Users,
  CheckCircle2,
  Waves,
  AlertTriangle,
  X,
  UserCheck,
  Shield,
} from 'lucide-react';

interface DailyOpsViewProps {
  activities: DailyActivity[];
  students: Student[];
  instructors: User[];
  userRole: UserRole;
  onRefresh: () => void;
  onCreateActivity: (activityData: any) => Promise<void>;
  onUpdateActivityStatus: (activityId: string, status: string) => Promise<void>;
  onAddParticipant: (activityId: string, participantData: any) => Promise<void>;
  lang: Language;
}

export const DailyOpsView: React.FC<DailyOpsViewProps> = ({
  activities,
  students,
  instructors,
  userRole,
  onRefresh,
  onCreateActivity,
  onUpdateActivityStatus,
  onAddParticipant,
  lang,
}) => {
  const t = translations[lang];

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedActivityForRoster, setSelectedActivityForRoster] = useState<DailyActivity | null>(null);
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New activity form
  const [newActivity, setNewActivity] = useState({
    title: '',
    activity_type: 'depth_training',
    location: 'Blue Hole',
    activity_date: new Date().toISOString().slice(0, 10),
    start_time: '08:30',
    end_time: '11:30',
    lead_instructor_id: instructors[0]?.id || '',
    safety_diver_name: 'Karim Al-Husseini',
    max_depth_target: 40,
    max_pax: 4,
    sea_conditions: 'Calm sea, 24°C water, 30m visibility',
    notes: 'Emergency O2 pack and counterweight checked.',
  });

  // Participant form
  const [participantData, setParticipantData] = useState({
    student_id: students[0]?.id || '',
    attendance_status: 'checked_in',
    depth_achieved: 0,
    notes: '',
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await onCreateActivity(newActivity);
      setIsCreateModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityForRoster) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await onAddParticipant(selectedActivityForRoster.id, participantData);
      setIsAddParticipantModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add participant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Ocean Board Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8EEF7] dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-[#28334E] dark:text-white flex items-center gap-2">
              <Anchor className="w-5 h-5 text-[#4C8BF5]" />
              <span>Dahab Ocean Operations Board</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#4C8BF5] dark:bg-blue-950/60 dark:text-cyan-300 border border-blue-200 dark:border-blue-800">
              Red Sea Daily Board
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time management for deep lines, coastal reef dives, safety tenders, and briefings.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4C8BF5] hover:bg-[#3B7BE8] text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Ocean Session</span>
        </button>
      </div>

      {/* Red Sea Environmental Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-slate-800 text-[#4C8BF5] border border-blue-100 dark:border-slate-700">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Dahab Dive Sites</div>
            <div className="text-xs font-bold text-[#28334E] dark:text-white mt-0.5">Blue Hole • Lighthouse • Eel Garden • Canyon</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-slate-700">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Current Ocean Conditions</div>
            <div className="text-xs font-bold text-teal-600 dark:text-teal-300 mt-0.5">Water 24°C • Vis 35m • Surface 8 kts N</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E8EEF7] dark:border-slate-800 shadow-[0_2px_12px_rgba(40,51,78,0.02)] flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-slate-700">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Safety & Rescue Readiness</div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-300 mt-0.5">100% O2 Checked • Safety Buoys Deployed</div>
          </div>
        </div>
      </div>

      {/* Activity Cards List */}
      <div className="space-y-4">
        {activities.map((act) => {
          const isCompleted = act.status === 'completed';
          const isInWater = act.status === 'in_water';

          return (
            <div
              key={act.id}
              className={`p-5 rounded-2xl border transition-all shadow-[0_2px_12px_rgba(40,51,78,0.02)] space-y-4 ${
                isInWater
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-[#4C8BF5] ring-1 ring-[#4C8BF5]/20'
                  : 'bg-white dark:bg-[#1E293B] border-[#E8EEF7] dark:border-slate-800 hover:border-[#4C8BF5]/40'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{act.title}</h3>
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-100 text-[#4C8BF5] dark:bg-blue-950/80 dark:text-blue-300">
                      {act.location}
                    </span>
                    {act.max_depth_target > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Target: {act.max_depth_target}m
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 text-[#4C8BF5] font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{act.activity_date} • {act.start_time} - {act.end_time}</span>
                    </span>
                    <span>Lead: <strong className="text-slate-800 dark:text-white">{act.lead_instructor_name || 'Staff'}</strong></span>
                    {act.safety_diver_name && (
                      <span>Safety: <strong className="text-[#4C8BF5]">{act.safety_diver_name}</strong></span>
                    )}
                  </div>
                </div>

                {/* Status Badges & Action Buttons */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                    isCompleted
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : isInWater
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 animate-pulse'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {act.status.replace('_', ' ')}
                  </span>

                  {act.status === 'planned' && (
                    <button
                      onClick={() => onUpdateActivityStatus(act.id, 'briefing_done')}
                      className="px-2.5 py-1 rounded-lg bg-cyan-900/80 hover:bg-cyan-800 text-cyan-200 text-xs font-medium cursor-pointer transition-colors"
                    >
                      Briefing Done →
                    </button>
                  )}
                  {act.status === 'briefing_done' && (
                    <button
                      onClick={() => onUpdateActivityStatus(act.id, 'in_water')}
                      className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      Deploy to Water →
                    </button>
                  )}
                  {act.status === 'in_water' && (
                    <button
                      onClick={() => onUpdateActivityStatus(act.id, 'completed')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm"
                    >
                      Complete Session ✓
                    </button>
                  )}
                </div>
              </div>

              {/* Conditions & Notes */}
              <div className="text-xs text-slate-300 bg-[#071322] p-3 rounded-xl border border-cyan-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-cyan-400">Sea Conditions:</strong> {act.sea_conditions}
                </div>
                {act.notes && (
                  <div className="text-slate-400 italic">
                    Note: {act.notes}
                  </div>
                )}
              </div>

              {/* Participants Roster */}
              <div className="pt-2 border-t border-cyan-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Diver Roster ({act.participants?.length || 0} / {act.max_pax} max)</span>
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {act.participants?.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 rounded text-[11px] bg-[#0d223d] text-cyan-200 border border-cyan-900 flex items-center gap-1"
                      >
                        <span>{p.first_name} {p.last_name[0]}.</span>
                        {p.depth_achieved > 0 && (
                          <span className="text-amber-400 font-mono font-bold">({p.depth_achieved}m)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedActivityForRoster(act);
                    setIsAddParticipantModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-medium cursor-pointer self-start sm:self-auto"
                >
                  + Add Diver to Session
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW OCEAN ACTIVITY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091728] border border-cyan-800/60 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-cyan-900/50 flex items-center justify-between bg-[#071322]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Anchor className="w-4 h-4 text-cyan-400" />
                <span>Schedule Dahab Ocean Dive / Event</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  placeholder="e.g. Blue Hole Deep Line Session 1 (60m)"
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Dahab Dive Location *</label>
                  <select
                    value={newActivity.location}
                    onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Blue Hole">Blue Hole</option>
                    <option value="Lighthouse">Lighthouse Bay</option>
                    <option value="Eel Garden">Eel Garden</option>
                    <option value="The Canyon">The Canyon</option>
                    <option value="The Bells">The Bells to Blue Hole</option>
                    <option value="Ras Abu Galum">Ras Abu Galum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Activity Type</label>
                  <select
                    value={newActivity.activity_type}
                    onChange={(e) => setNewActivity({ ...newActivity, activity_type: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="depth_training">Depth Training Buoy</option>
                    <option value="course_session">Course Ocean Session</option>
                    <option value="fun_dive_trip">Fun Dive Reef Safari</option>
                    <option value="safari_blue_hole">Blue Hole Excursion</option>
                    <option value="equalization_workshop">Equalization Clinic</option>
                    <option value="breathing_session">Static & Breathing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newActivity.activity_date}
                    onChange={(e) => setNewActivity({ ...newActivity, activity_date: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={newActivity.start_time}
                    onChange={(e) => setNewActivity({ ...newActivity, start_time: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={newActivity.end_time}
                    onChange={(e) => setNewActivity({ ...newActivity, end_time: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Lead Instructor</label>
                  <select
                    value={newActivity.lead_instructor_id}
                    onChange={(e) => setNewActivity({ ...newActivity, lead_instructor_id: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>{i.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Safety Diver</label>
                  <input
                    type="text"
                    value={newActivity.safety_diver_name}
                    onChange={(e) => setNewActivity({ ...newActivity, safety_diver_name: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Line Depth (m)</label>
                  <input
                    type="number"
                    value={newActivity.max_depth_target}
                    onChange={(e) => setNewActivity({ ...newActivity, max_depth_target: Number(e.target.value) })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max Pax (Capacity)</label>
                  <input
                    type="number"
                    value={newActivity.max_pax}
                    onChange={(e) => setNewActivity({ ...newActivity, max_pax: Number(e.target.value) })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Sea Conditions & Safety Notes</label>
                <input
                  type="text"
                  value={newActivity.sea_conditions}
                  onChange={(e) => setNewActivity({ ...newActivity, sea_conditions: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/50">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#071322] font-semibold cursor-pointer shadow-md"
                >
                  {submitting ? 'Scheduling...' : 'Save to Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PARTICIPANT MODAL */}
      {isAddParticipantModalOpen && selectedActivityForRoster && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#091728] border border-cyan-800/60 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto text-slate-200 shadow-2xl">
            <div className="p-5 border-b border-cyan-900/50 flex items-center justify-between bg-[#071322]">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                <span>Add Diver to {selectedActivityForRoster.location}</span>
              </h3>
              <button
                onClick={() => setIsAddParticipantModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleParticipantSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Diver *</label>
                <select
                  required
                  value={participantData.student_id}
                  onChange={(e) => setParticipantData({ ...participantData, student_id: e.target.value })}
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.certification_agency} {s.certification_level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Check-in Status</label>
                  <select
                    value={participantData.attendance_status}
                    onChange={(e) => setParticipantData({ ...participantData, attendance_status: e.target.value })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="checked_in">Checked In (Ready)</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Session Completed</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Depth Achieved (m)</label>
                  <input
                    type="number"
                    value={participantData.depth_achieved}
                    onChange={(e) => setParticipantData({ ...participantData, depth_achieved: Number(e.target.value) })}
                    className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Performance & Safety Notes</label>
                <input
                  type="text"
                  value={participantData.notes}
                  onChange={(e) => setParticipantData({ ...participantData, notes: e.target.value })}
                  placeholder="e.g. Freefall technique, clean surface protocol..."
                  className="w-full bg-[#071322] border border-cyan-900/60 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cyan-900/50">
                <button
                  type="button"
                  onClick={() => setIsAddParticipantModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#071322] font-semibold cursor-pointer shadow-md"
                >
                  {submitting ? 'Adding...' : 'Add to Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
