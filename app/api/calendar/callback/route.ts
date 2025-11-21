// API route for handling Google Calendar OAuth callback
import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '../../../lib/google-calendar';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/calendar?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'Missing authorization code' },
      { status: 400 }
    );
  }

  try {
    const calendarService = new GoogleCalendarService();
    const tokens = await calendarService.getTokenFromCode(code);

    // In a production app, you would store these tokens securely
    // For now, we'll redirect with them as URL params (not secure, demo only)
    const redirectUrl = new URL('/calendar', request.url);
    redirectUrl.searchParams.set('tokens', Buffer.from(JSON.stringify(tokens)).toString('base64'));

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.redirect(
      new URL('/calendar?error=auth_failed', request.url)
    );
  }
}
