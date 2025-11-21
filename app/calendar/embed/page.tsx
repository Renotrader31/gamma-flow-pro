'use client';

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, LogIn } from 'lucide-react';
import type { CalendarEvent, GoogleCalendar } from '../../types/calendar';

export default function CalendarEmbedPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokens, setTokens] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(['primary']);
  const [events, setEvents] = useState<{ calendarId: string; events: CalendarEvent[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Check for tokens in sessionStorage or URL
    const params = new URLSearchParams(window.location.search);
    const tokensParam = params.get('tokens');

    if (tokensParam) {
      setTokens(tokensParam);
      setIsAuthenticated(true);
      sessionStorage.setItem('google_calendar_tokens_embed', tokensParam);
      window.history.replaceState({}, '', '/calendar/embed');
      loadCalendarsAndEvents(tokensParam);
    } else {
      const storedTokens = sessionStorage.getItem('google_calendar_tokens_embed');
      if (storedTokens) {
        setTokens(storedTokens);
        setIsAuthenticated(true);
        loadCalendarsAndEvents(storedTokens);
      }
    }
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (isAuthenticated && tokens && autoRefresh) {
      const interval = setInterval(() => {
        loadEvents(tokens, selectedCalendars);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, tokens, autoRefresh, selectedCalendars]);

  const loadCalendarsAndEvents = async (authTokens: string) => {
    setLoading(true);
    try {
      // Load calendars
      const calendarsResponse = await fetch('/api/calendar/calendars', {
        headers: { Authorization: `Bearer ${authTokens}` },
      });
      const calendarsData = await calendarsResponse.json();

      if (calendarsData.calendars) {
        setCalendars(calendarsData.calendars);

        // Get all calendar IDs
        const allCalendarIds = calendarsData.calendars.map((cal: GoogleCalendar) => cal.id);
        setSelectedCalendars(allCalendarIds);

        // Load events for all calendars
        loadEvents(authTokens, allCalendarIds);
      }
    } catch (err) {
      console.error('Failed to load calendars:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (authTokens: string, calendarIds: string[]) => {
    try {
      const response = await fetch(
        `/api/calendar/events?calendarIds=${calendarIds.join(',')}&daysAhead=30`,
        {
          headers: { Authorization: `Bearer ${authTokens}` },
        }
      );

      const data = await response.json();

      if (data.calendarEvents) {
        setEvents(data.calendarEvents);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const handleLogin = () => {
    window.open('/calendar', '_blank');
  };

  const handleRefresh = () => {
    if (tokens) {
      loadEvents(tokens, selectedCalendars);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let datePrefix = '';
    if (diffDays === 0) datePrefix = 'Today';
    else if (diffDays === 1) datePrefix = 'Tomorrow';
    else if (diffDays > 1 && diffDays <= 7) datePrefix = date.toLocaleDateString('en-US', { weekday: 'long' });

    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (datePrefix) {
      return `${datePrefix} at ${time}`;
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getColorForCalendar = (calendarId: string, index: number) => {
    const colors = [
      'border-l-purple-500',
      'border-l-blue-500',
      'border-l-green-500',
      'border-l-yellow-500',
      'border-l-red-500',
      'border-l-pink-500',
      'border-l-indigo-500',
      'border-l-cyan-500',
    ];
    return colors[index % colors.length];
  };

  // Combine and sort all events by date
  const allEvents = events
    .flatMap(({ calendarId, events: calendarEvents }, index) =>
      calendarEvents.map(event => ({
        ...event,
        calendarId,
        calendarName: calendars.find(c => c.id === calendarId)?.summary || 'Calendar',
        colorClass: getColorForCalendar(calendarId, index),
      }))
    )
    .sort((a, b) =>
      new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
    );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] p-4 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4">Google Calendar</h2>
          <p className="text-gray-400 mb-6 text-sm">
            Connect your Google Calendar to view your events
          </p>
          <button
            onClick={handleLogin}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition mx-auto"
          >
            <LogIn className="w-4 h-4" />
            Connect Calendar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold">My Calendar</h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-sm transition"
            title="Refresh events"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Calendar Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-400">{calendars.length}</div>
            <div className="text-xs text-gray-500">Calendars</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-400">{allEvents.length}</div>
            <div className="text-xs text-gray-500">Total Events</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-400">
              {allEvents.filter(e => {
                const eventDate = new Date(e.start.dateTime);
                const today = new Date();
                return eventDate.toDateString() === today.toDateString();
              }).length}
            </div>
            <div className="text-xs text-gray-500">Today</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-400">
              {allEvents.filter(e => {
                const eventDate = new Date(e.start.dateTime);
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                return eventDate.toDateString() === tomorrow.toDateString();
              }).length}
            </div>
            <div className="text-xs text-gray-500">Tomorrow</div>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          {loading && allEvents.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
              <p className="text-gray-400 text-sm">Loading events...</p>
            </div>
          ) : allEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-sm">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allEvents.map((event, index) => (
                <div
                  key={`${event.calendarId}-${event.id}-${index}`}
                  className={`bg-gray-800 border-l-4 ${event.colorClass} rounded-r-lg p-3 hover:bg-gray-750 transition`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate">{event.summary}</h4>
                      {event.description && (
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>⏰ {formatDate(event.start.dateTime)}</span>
                        {event.location && (
                          <span className="truncate">📍 {event.location}</span>
                        )}
                      </div>
                      <div className="text-xs text-purple-400 mt-1">{event.calendarName}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-xs text-gray-600">
          Auto-refreshes every 5 minutes • {selectedCalendars.length} calendar(s) synced
        </div>
      </div>
    </div>
  );
}
