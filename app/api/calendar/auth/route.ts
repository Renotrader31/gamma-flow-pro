// API route for initiating Google Calendar OAuth
import { NextResponse } from 'next/server';
import { GoogleCalendarService } from '../../../lib/google-calendar';

export async function GET() {
  try {
    const calendarService = new GoogleCalendarService();
    const authUrl = calendarService.getAuthUrl();

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
}
