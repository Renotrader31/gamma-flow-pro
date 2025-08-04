import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🕐 Checking market status...');
    
    // Simple time-based market status
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    let status = 'closed';
    
    // Monday to Friday
    if (day >= 1 && day <= 5) {
      const marketOpen = 9 * 60 + 30; // 9:30 AM
      const marketClose = 16 * 60; // 4:00 PM
      const preMarketStart = 4 * 60; // 4:00 AM
      const afterHoursEnd = 20 * 60; // 8:00 PM
      
      if (currentTime >= marketOpen && currentTime < marketClose) {
        status = 'open';
      } else if (currentTime >= preMarketStart && currentTime < marketOpen) {
        status = 'pre-market';
      } else if (currentTime >= marketClose && currentTime < afterHoursEnd) {
        status = 'after-hours';
      }
    }
    
    console.log(`✅ Market status: ${status}`);
    
    return NextResponse.json({
      success: true,
      market: status,
      timestamp: new Date().toISOString(),
      timezone: 'EST'
    });
    
  } catch (error) {
    console.error('Market Status API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}