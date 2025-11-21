'use client';

import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Settings, ExternalLink, Download } from 'lucide-react';
import type { CalendarEvent, GoogleCalendar } from '../types/calendar';

export default function CalendarPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokens, setTokens] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(['primary']);
  const [events, setEvents] = useState<{ calendarId: string; events: CalendarEvent[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for tokens in URL (from OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const tokensParam = params.get('tokens');
    const errorParam = params.get('error');

    if (tokensParam) {
      setTokens(tokensParam);
      setIsAuthenticated(true);
      // Store in sessionStorage
      sessionStorage.setItem('google_calendar_tokens', tokensParam);
      // Clean URL
      window.history.replaceState({}, '', '/calendar');
      loadCalendars(tokensParam);
    } else if (errorParam) {
      setError(`Authentication error: ${errorParam}`);
    } else {
      // Check sessionStorage
      const storedTokens = sessionStorage.getItem('google_calendar_tokens');
      if (storedTokens) {
        setTokens(storedTokens);
        setIsAuthenticated(true);
        loadCalendars(storedTokens);
      }
    }
  }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/calendar/auth');
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      setError('Failed to initiate authentication');
      console.error(err);
    }
  };

  const loadCalendars = async (authTokens: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/calendar/calendars', {
        headers: {
          Authorization: `Bearer ${authTokens}`,
        },
      });

      const data = await response.json();

      if (data.calendars) {
        setCalendars(data.calendars);
        // Auto-load events for primary calendar
        loadEvents(authTokens, ['primary']);
      }
    } catch (err) {
      setError('Failed to load calendars');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (authTokens: string, calendarIds: string[]) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/calendar/events?calendarIds=${calendarIds.join(',')}&daysAhead=30`,
        {
          headers: {
            Authorization: `Bearer ${authTokens}`,
          },
        }
      );

      const data = await response.json();

      if (data.calendarEvents) {
        setEvents(data.calendarEvents);
      }
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (tokens) {
      loadEvents(tokens, selectedCalendars);
    }
  };

  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendars(prev => {
      const newSelected = prev.includes(calendarId)
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId];

      if (tokens && newSelected.length > 0) {
        loadEvents(tokens, newSelected);
      }

      return newSelected;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getEmbedUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/calendar/embed`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Calendar className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold">Google Calendar Sync</h1>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <Calendar className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-4">Connect Your Google Calendar</h2>
            <p className="text-gray-400 mb-6">
              Sync your Google Calendar to view all your events and subscriptions in one place.
              You can then embed this calendar in start.me or any other platform.
            </p>

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition"
            >
              Connect Google Calendar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold">Google Calendar Sync</h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Calendar Selection */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Your Calendars
              </h2>

              <div className="space-y-2">
                {calendars.map(calendar => (
                  <label
                    key={calendar.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCalendars.includes(calendar.id)}
                      onChange={() => toggleCalendar(calendar.id)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{calendar.summary}</div>
                      {calendar.description && (
                        <div className="text-xs text-gray-500">{calendar.description}</div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <h3 className="text-sm font-bold mb-3">Embed in start.me</h3>
                <div className="bg-gray-800 rounded p-3 mb-3">
                  <p className="text-xs text-gray-400 mb-2">Embed URL:</p>
                  <code className="text-xs break-all text-purple-400">{getEmbedUrl()}</code>
                </div>
                <a
                  href={getEmbedUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Embed View
                </a>
              </div>
            </div>
          </div>

          {/* Main Content - Events List */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Upcoming Events</h2>

              {loading ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
                  <p className="text-gray-400">Loading events...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map(({ calendarId, events: calendarEvents }) => {
                    const calendar = calendars.find(c => c.id === calendarId);
                    return (
                      <div key={calendarId}>
                        {calendar && (
                          <h3 className="text-sm font-bold text-purple-400 mb-2">
                            {calendar.summary}
                          </h3>
                        )}

                        <div className="space-y-2">
                          {calendarEvents.length === 0 ? (
                            <p className="text-gray-500 text-sm">No upcoming events</p>
                          ) : (
                            calendarEvents.map(event => (
                              <div
                                key={event.id}
                                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-bold">{event.summary}</h4>
                                    {event.description && (
                                      <p className="text-sm text-gray-400 mt-1">
                                        {event.description}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                      <span>{formatDate(event.start.dateTime)}</span>
                                      {event.location && (
                                        <span className="flex items-center gap-1">
                                          📍 {event.location}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
