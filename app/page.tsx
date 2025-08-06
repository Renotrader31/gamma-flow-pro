'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [currentTime, setCurrentTime] = useState('')
  
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
    return () => clearInterval(interval)
  }, [])

  const scanners = [
    { icon: '🔥', color: 'orange', title: 'Top Movers', desc: 'Stocks with significant price movement' },
    { icon: '📊', color: 'purple', title: 'High Volume', desc: 'Stocks with high trading volume' },
    { icon: '📈', color: 'blue', title: 'Large Caps', desc: 'Large market cap stocks' },
    { icon: '📉', color: 'red', title: 'IV Crush Play', desc: 'High IV rank for premium selling' },
    { icon: '🎯', color: 'green', title: 'Gamma Wall Pin', desc: 'Stocks pinned by gamma exposure' },
    { icon: '🚀', color: 'yellow', title: 'Short Squeeze Setup', desc: 'High SI with positive flow' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F1A] to-[#1A1A2E] text-white">
      <div className="container mx-auto px-4 py-6">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="text-purple-500 text-4xl">📊</div>
            <div>
              <h1 className="text-3xl font-bold">Gamma Flow Pro</h1>
              <p className="text-sm text-gray-400">Advanced Options Analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-gray-400">Offline</span>
            </div>
            <div className="text-gray-400">
              Updated: {currentTime}
            </div>
          </div>
        </header>

        <p className="text-gray-400 mb-6">Real-time gamma exposure, options flow, and dark pool analysis</p>

        <div className="flex space-x-4 mb-8">
          <button className="px-6 py-3 bg-gray-700 rounded-lg flex items-center space-x-2 hover:bg-gray-600 transition">
            <span>🔍</span>
            <span>Screener Mode</span>
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center space-x-2 text-white">
            <span>📡</span>
            <span>Scanner Mode</span>
          </button>
        </div>

        <div className="flex space-x-4 mb-8 justify-end">
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center space-x-2 text-white">
            <span>⚡</span>
            <span>AI Trade Ideas</span>
          </button>
          <button className="px-6 py-3 bg-green-600 rounded-lg flex items-center space-x-2 text-white hover:bg-green-700 transition">
            <span>✅</span>
            <span>Scan All Strategies</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scanners.map((scanner, idx) => (
            <div key={idx} className="bg-[#1A1A2E]/80 backdrop-blur-lg border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/50 hover:-translate-y-1 transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 bg-${scanner.color}-500/20 rounded-lg flex items-center justify-center`}>
                    <span className="text-2xl">{scanner.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{scanner.title}</h3>
                    <p className="text-sm text-gray-400">{scanner.desc}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-white">
                  <span>ⓘ</span>
                </button>
              </div>
              <div className="text-3xl font-bold mb-2">0</div>
              <div className="text-sm text-gray-400">stocks found</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
