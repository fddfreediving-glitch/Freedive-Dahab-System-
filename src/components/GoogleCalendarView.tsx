import React from 'react';

const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/u/1/r/month';

function getCalendarEmbedUrl(): string | null {
  const configuredEmbedUrl = import.meta.env.VITE_GOOGLE_CALENDAR_EMBED_URL?.trim();

  if (configuredEmbedUrl) {
    try {
      const url = new URL(configuredEmbedUrl);
      if (
        url.protocol !== 'https:' ||
        url.hostname !== 'calendar.google.com' ||
        url.pathname !== '/calendar/embed'
      ) {
        return null;
      }
      return url.toString();
    } catch {
      return null;
    }
  }

  const calendarId = import.meta.env.VITE_GOOGLE_CALENDAR_ID?.trim();
  if (!calendarId || calendarId.toLowerCase() === 'primary') return null;

  const url = new URL('https://calendar.google.com/calendar/embed');
  url.searchParams.set('src', calendarId);
  url.searchParams.set('ctz', 'Africa/Cairo');
  url.searchParams.set('mode', 'MONTH');
  return url.toString();
}

export const GoogleCalendarView: React.FC = () => {
  const configuredEmbedUrl = import.meta.env.VITE_GOOGLE_CALENDAR_EMBED_URL?.trim();
  const embedUrl = getCalendarEmbedUrl();
  const hasInvalidEmbedUrl = Boolean(configuredEmbedUrl) && !embedUrl;

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Google Calendar</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Your Google Calendar, displayed in the ERP. ERP sessions, activities, and accommodation
            dates are not automatically synced.
          </p>
        </div>
        <a
          href={GOOGLE_CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Open Google Calendar
        </a>
      </header>

      {embedUrl ? (
        <iframe
          title="Google Calendar month view"
          src={embedUrl}
          className="h-[75vh] min-h-[560px] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-700"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : hasInvalidEmbedUrl ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
        >
          The Google Calendar embed URL is invalid. Set{' '}
          <code className="font-semibold">VITE_GOOGLE_CALENDAR_EMBED_URL</code> to a Google
          Calendar embed URL, or clear it to use the configured calendar ID.
        </div>
      ) : (
        <section className="flex min-h-[50vh] items-center justify-center rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:p-10">
          <div className="max-w-2xl space-y-3 text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Open your Google Calendar
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Google blocks private calendars, including the primary calendar, from loading in
              embedded frames when account access is unavailable. Use “Open Google Calendar” to
              view it in a full browser tab. To embed a calendar here, configure its public
              calendar ID or Google Calendar embed URL.
            </p>
          </div>
        </section>
      )}
    </main>
  );
};
