// API route for listing Google Calendars
import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '../../../lib/google-calendar';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  try {
    const tokensBase64 = authHeader.substring(7);
    const tokens = JSON.parse(Buffer.from(tokensBase64, 'base64').toString());

    const calendarService = new GoogleCalendarService();
    calendarService.setCredentials(tokens);

    const calendars = await calendarService.listCalendars();

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('Error listing calendars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}
