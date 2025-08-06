'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [currentTime, setCurrentTime] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    
    // Simulate going online after 2 seconds
    setTimeout(() => setIsOnline(true), 2000)
    
    return () => clearInterval(interval)
  }, [])

  const scanners = [
    { icon: '🔥', bgColor: 'bg-orange-500/20', title: 'Top Movers', desc: 'Stocks with significant price movement', count: 0 },
    { icon: '📊', bgColor: 'bg-purple-500/20', title: 'High Volume', desc: 'Stocks with high trading volume', count: 0 },
    { icon: '📈', bgColor: 'bg-blue-500/20', title: 'Large Caps', desc: 'Large market cap stocks', count: 0 },
    { icon: '📉', bgColor: 'bg-red-500/20', title: 'IV Crush Play', desc: 'High IV rank for premium selling', count: 0 },
    { icon: '🎯', bgColor: 'bg-green-500/20', title: 'Gamma Wall Pin', desc: 'Stocks pinned by gamma exposure', count: 0 },
    { icon: '🚀', bgColor: 'bg-yellow-500/20', title: 'Short Squeeze Setup', desc: 'High SI with positive flow', count: 0 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F1A] to-[#1A1A2E] text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <div>
              <h1 className="text-3xl font-bold">Gamma Flow Pro</h1>
              <p className="text-sm text-gray-400">Advanced Options Analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="text-gray-400">{isOnline ? 'Online' : 'Connecting...'}</span>
            </div>
            <div className="text-gray-400">
              Updated: {currentTime || '--:--:--'}
            </div>
          </div>
        </header>

        <p className="text-gray-400 mb-6">Real-time gamma exposure, options flow, and dark pool analysis</p>

        <div className="flex flex-wrap gap-4 mb-8">
          <button className="px-6 py-3 bg-gray-700 rounded-lg flex items-center space-x-2 hover:bg-gray-600 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            <span>Screener Mode</span>
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center space-x-2 text-white shadow-lg shadow-purple-500/25">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <span>Scanner Mode</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 justify-end">
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center space-x-2 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span>AI Trade Ideas</span>
          </button>
          <button className="px-6 py-3 bg-green-600 rounded-lg flex items-center space-x-2 text-white hover:bg-green-700 transition shadow-lg shadow-green-500/25">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Scan All Strategies</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scanners.map((scanner, idx) => (
            <div 
              key={idx} 
              className="bg-[#1A1A2E]/80 backdrop-blur-lg border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/50 hover:-translate-y-1 transition-all cursor-pointer hover:shadow-xl hover:shadow-purple-500/10"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${scanner.bgColor} rounded-lg flex items-center justify-center`}>
                    <span className="text-2xl">{scanner.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{scanner.title}</h3>
                    <p className="text-sm text-gray-400">{scanner.desc}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-white transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </div>
              <div className="text-3xl font-bold mb-2">{scanner.count}</div>
              <div className="text-sm text-gray-400">stocks found</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
