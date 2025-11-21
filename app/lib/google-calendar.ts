// Google Calendar API service
import { google } from 'googleapis';
import type { CalendarEvent, GoogleCalendar } from '../types/calendar';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'];

export class GoogleCalendarService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/callback'
    );
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
  }

  async getTokenFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
  }

  async listCalendars(): Promise<GoogleCalendar[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.calendarList.list();
      return (response.data.items || []).map(cal => ({
        id: cal.id || '',
        summary: cal.summary || '',
        description: cal.description,
        primary: cal.primary,
        backgroundColor: cal.backgroundColor,
        foregroundColor: cal.foregroundColor,
        selected: cal.selected,
      }));
    } catch (error) {
      console.error('Error listing calendars:', error);
      throw error;
    }
  }

  async listEvents(calendarId: string = 'primary', timeMin?: Date, timeMax?: Date): Promise<CalendarEvent[]> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin?.toISOString() || new Date().toISOString(),
        timeMax: timeMax?.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
      });

      return (response.data.items || []).map(event => ({
        id: event.id,
        summary: event.summary || 'No Title',
        description: event.description,
        start: {
          dateTime: event.start?.dateTime || event.start?.date || '',
          timeZone: event.start?.timeZone,
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date || '',
          timeZone: event.end?.timeZone,
        },
        colorId: event.colorId,
        location: event.location,
      }));
    } catch (error) {
      console.error('Error listing events:', error);
      throw error;
    }
  }

  async getAllCalendarEvents(calendarIds: string[] = ['primary'], timeMin?: Date, timeMax?: Date): Promise<{ calendarId: string; events: CalendarEvent[] }[]> {
    const results = await Promise.all(
      calendarIds.map(async (calendarId) => {
        try {
          const events = await this.listEvents(calendarId, timeMin, timeMax);
          return { calendarId, events };
        } catch (error) {
          console.error(`Error fetching events for calendar ${calendarId}:`, error);
          return { calendarId, events: [] };
        }
      })
    );
    return results;
  }

  async createEvent(calendarId: string = 'primary', event: CalendarEvent): Promise<CalendarEvent> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      return {
        id: response.data.id,
        summary: response.data.summary || '',
        description: response.data.description,
        start: {
          dateTime: response.data.start?.dateTime || response.data.start?.date || '',
          timeZone: response.data.start?.timeZone,
        },
        end: {
          dateTime: response.data.end?.dateTime || response.data.end?.date || '',
          timeZone: response.data.end?.timeZone,
        },
        colorId: response.data.colorId,
        location: response.data.location,
      };
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(calendarId: string = 'primary', eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      const response = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: event,
      });

      return {
        id: response.data.id,
        summary: response.data.summary || '',
        description: response.data.description,
        start: {
          dateTime: response.data.start?.dateTime || response.data.start?.date || '',
          timeZone: response.data.start?.timeZone,
        },
        end: {
          dateTime: response.data.end?.dateTime || response.data.end?.date || '',
          timeZone: response.data.end?.timeZone,
        },
        colorId: response.data.colorId,
        location: response.data.location,
      };
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    try {
      await calendar.events.delete({
        calendarId,
        eventId,
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
}
