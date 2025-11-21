// API route for managing Google Calendar events
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

    const searchParams = request.nextUrl.searchParams;
    const calendarIds = searchParams.get('calendarIds')?.split(',') || ['primary'];
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30');

    const calendarService = new GoogleCalendarService();
    calendarService.setCredentials(tokens);

    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + daysAhead);

    const calendarEvents = await calendarService.getAllCalendarEvents(
      calendarIds,
      timeMin,
      timeMax
    );

    return NextResponse.json({ calendarEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { calendarId = 'primary', event } = body;

    if (!event) {
      return NextResponse.json(
        { error: 'Missing event data' },
        { status: 400 }
      );
    }

    const calendarService = new GoogleCalendarService();
    calendarService.setCredentials(tokens);

    const createdEvent = await calendarService.createEvent(calendarId, event);

    return NextResponse.json({ event: createdEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}
