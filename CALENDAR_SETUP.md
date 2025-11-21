# Google Calendar Sync & Embed Setup

This guide will help you set up Google Calendar integration for Gamma Flow Pro and embed it in start.me.

## Features

- 📅 Sync with your Google Calendar and all subscriptions
- 🔄 Auto-refresh events every 5 minutes
- 📊 View events from multiple calendars in one place
- 🎨 Color-coded calendar events
- 📱 Responsive design for desktop and mobile
- 🔗 Embeddable in start.me or any iframe-compatible platform

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application" as the application type
4. Configure the OAuth consent screen if prompted:
   - User Type: External (for personal use) or Internal (for workspace)
   - Add your email and app information
   - Add scopes: `calendar.readonly` and `calendar.events`
5. Add **Authorized redirect URIs**:
   - For local development: `http://localhost:3000/api/calendar/callback`
   - For production: `https://yourdomain.com/api/calendar/callback`
6. Click "Create" and save your credentials

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Google Calendar credentials to `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
   ```

3. For production, update the `GOOGLE_REDIRECT_URI` to your production domain

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

```bash
npm run dev
```

Visit `http://localhost:3000/calendar` to start using the calendar sync.

## Usage

### Connecting Your Calendar

1. Navigate to `/calendar`
2. Click "Connect Google Calendar"
3. Sign in with your Google account
4. Grant permissions to read and manage your calendar events
5. You'll be redirected back to the app with your calendars loaded

### Viewing Events

- All your calendars will be displayed in the sidebar
- Toggle calendars on/off to filter events
- Events are automatically sorted by date and time
- Click "Refresh" to manually sync the latest events

### Embedding in start.me

1. After connecting your calendar, navigate to `/calendar/embed`
2. Copy the embed URL: `http://localhost:3000/calendar/embed`
3. In start.me:
   - Add a new widget
   - Choose "Custom Widget" or "Iframe"
   - Paste the embed URL
   - Adjust the widget size as needed

**Recommended widget dimensions for start.me:**
- Width: 600-800px
- Height: 600-800px

### Auto-Authentication for Embed

The embed page stores authentication tokens in session storage, so you need to authenticate once in the main calendar page (`/calendar`), and then the embed page will automatically use the same session.

**Steps:**
1. Open `/calendar` in your browser
2. Connect your Google Calendar
3. Open `/calendar/embed` in the same browser
4. The embed will automatically authenticate using the same session

## Features Details

### Auto-Refresh
- Events automatically refresh every 5 minutes when the embed page is open
- Manual refresh available via the refresh button

### Multi-Calendar Support
- View events from all your Google Calendars
- Including subscribed calendars (holidays, sports, etc.)
- Each calendar is color-coded for easy identification

### Event Display
- Shows event title, description, time, and location
- Smart date formatting (Today, Tomorrow, or specific date)
- Events sorted chronologically

### Statistics Dashboard
- Total number of calendars synced
- Total upcoming events
- Events today
- Events tomorrow

## Security Notes

⚠️ **Important**: This is a demonstration implementation. For production use, you should:

1. **Store tokens securely**: Use a database or secure session storage instead of client-side session storage
2. **Implement token refresh**: Handle expired tokens and refresh them automatically
3. **Add user authentication**: Implement proper user accounts and authentication
4. **Use HTTPS**: Always use HTTPS in production
5. **Implement CORS properly**: Configure CORS headers for your specific domains
6. **Rate limiting**: Add rate limiting to API endpoints

## Troubleshooting

### "Authentication error" message
- Check that your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Verify the redirect URI matches exactly in both Google Console and `.env.local`
- Ensure the Google Calendar API is enabled in your project

### No events showing
- Check that you've selected calendars in the sidebar
- Verify your calendars have upcoming events (next 30 days)
- Check the browser console for any API errors

### Embed not working in start.me
- Make sure you've authenticated in the main calendar page first
- Check that start.me allows iframes from your domain
- Try using the full URL including `http://` or `https://`

### "Failed to fetch calendars" error
- Verify your OAuth tokens haven't expired
- Re-authenticate by visiting `/calendar` and clicking "Connect Google Calendar" again
- Check that the Google Calendar API is enabled

## API Endpoints

### `GET /api/calendar/auth`
Returns the Google OAuth authorization URL

### `GET /api/calendar/callback?code=...`
Handles the OAuth callback and exchanges the code for tokens

### `GET /api/calendar/calendars`
Lists all calendars for the authenticated user
- Requires: `Authorization: Bearer <tokens_base64>` header

### `GET /api/calendar/events?calendarIds=...&daysAhead=30`
Fetches events from specified calendars
- Requires: `Authorization: Bearer <tokens_base64>` header
- Query params:
  - `calendarIds`: Comma-separated list of calendar IDs
  - `daysAhead`: Number of days to fetch events for (default: 30)

### `POST /api/calendar/events`
Creates a new calendar event
- Requires: `Authorization: Bearer <tokens_base64>` header
- Body: `{ calendarId, event }`

## File Structure

```
app/
├── api/
│   └── calendar/
│       ├── auth/route.ts          # OAuth initialization
│       ├── callback/route.ts      # OAuth callback handler
│       ├── calendars/route.ts     # List calendars
│       └── events/route.ts        # Manage events
├── calendar/
│   ├── page.tsx                   # Main calendar page
│   └── embed/
│       └── page.tsx               # Embeddable calendar view
├── lib/
│   └── google-calendar.ts         # Google Calendar service
└── types/
    └── calendar.ts                # TypeScript types
```

## Future Enhancements

Potential improvements for this feature:

- [ ] Add event creation directly from the app
- [ ] Sync trading alerts to calendar automatically
- [ ] Add calendar event notifications
- [ ] Implement event search and filtering
- [ ] Add week/month/agenda view options
- [ ] Export events to other formats (ICS, CSV)
- [ ] Add recurring event support
- [ ] Implement event categories/tags
- [ ] Add time zone support
- [ ] Create custom calendar views (day, week, month)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the [Google Calendar API documentation](https://developers.google.com/calendar/api)
3. Open an issue on GitHub

## License

This calendar integration is part of Gamma Flow Pro and follows the same license as the main project.
