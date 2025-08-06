'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [currentTime, setCurrentTime] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [mode, setMode] = useState<'screener' | 'scanner'>('scanner')
  const [scanResults, setScanResults] = useState<{[key: string]: number}>({})
  
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
    
    setTimeout(() => setIsOnline(true), 1000)
    
    return () => clearInterval(interval)
  }, [])

  const scanners = [
    { id: 'movers', icon: '🔥', bgColor: 'bg-orange-500/20', title: 'Top Movers', desc: 'Stocks with significant price movement' },
    { id: 'volume', icon: '📊', bgColor: 'bg-purple-500/20', title: 'High Volume', desc: 'Stocks with high trading volume' },
    { id: 'caps', icon: '📈', bgColor: 'bg-blue-500/20', title: 'Large Caps', desc: 'Large market cap stocks' },
    { id: 'iv', icon: '📉', bgColor: 'bg-red-500/20', title: 'IV Crush Play', desc: 'High IV rank for premium selling' },
    { id: 'gamma', icon: '🎯', bgColor: 'bg-green-500/20', title: 'Gamma Wall Pin', desc: 'Stocks pinned by gamma exposure' },
    { id: 'squeeze', icon: '🚀', bgColor: 'bg-yellow-500/20', title: 'Short Squeeze Setup', desc: 'High SI with positive flow' },
  ]

  const startScan = () => {
    setIsScanning(true)
    setScanResults({})
    
    // Simulate scanning with progressive results
    scanners.forEach((scanner, index) => {
      setTimeout(() => {
        setScanResults(prev => ({
          ...prev,
          [scanner.id]: Math.floor(Math.random() * 15) + 1
        }))
      }, (index + 1) * 500)
    })

    setTimeout(() => {
      setIsScanning(false)
    }, scanners.length * 500 + 500)
  }

  const scanAll = () => {
    startScan()
  }

  const scanSingle = (scannerId: string) => {
    setIsScanning(true)
    setScanResults(prev => ({ ...prev, [scannerId]: 0 }))
    
    setTimeout(() => {
      setScanResults(prev => ({
        ...prev,
        [scannerId]: Math.floor(Math.random() * 15) + 1
      }))
      setIsScanning(false)
    }, 1500)
  }

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
              <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-yellow-500 animate-pulse' : isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></span>
              <span className="text-gray-400">
                {isScanning ? 'Scanning...' : isOnline ? 'Online' : 'Connecting...'}
              </span>
            </div>
            <div className="text-gray-400">
              Updated: {currentTime || '--:--:--'}
            </div>
          </div>
        </header>

        <p className="text-gray-400 mb-6">Real-time gamma exposure, options flow, and dark pool analysis</p>

        <div className="flex flex-wrap gap-4 mb-8">
          <button 
            onClick={() => setMode('screener')}
            className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition ${
              mode === 'screener' 
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            <span>Screener Mode</span>
          </button>
          <button 
            onClick={() => setMode('scanner')}
            className={`px-6 py-3 rounded-lg flex items-center space-x-2 transition ${
              mode === 'scanner' 
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <span>Scanner Mode</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 justify-between">
          <button 
            onClick={startScan}
            disabled={isScanning}
            className={`px-8 py-3 rounded-lg flex items-center space-x-2 text-white font-semibold transition ${
              isScanning 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
            }`}
          >
            {isScanning ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                </svg>
                <span>Start Scan</span>
              </>
            )}
          </button>

          <div className="flex gap-4">
            <button 
              onClick={() => alert('AI Trade Ideas coming soon!')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center space-x-2 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <span>AI Trade Ideas</span>
            </button>
            <button 
              onClick={scanAll}
              disabled={isScanning}
              className={`px-6 py-3 rounded-lg flex items-center space-x-2 text-white transition ${
                isScanning 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Scan All Strategies</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scanners.map((scanner) => (
            <div 
              key={scanner.id} 
              onClick={() => !isScanning && scanSingle(scanner.id)}
              className={`bg-[#1A1A2E]/80 backdrop-blur-lg border border-purple-500/20 rounded-xl p-6 transition-all ${
                isScanning ? 'cursor-wait' : 'cursor-pointer hover:border-purple-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10'
              }`}
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
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    alert(`${scanner.title}: ${scanner.desc}`)
                  }}
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
              </div>
              <div className="text-3xl font-bold mb-2">
                {scanResults[scanner.id] !== undefined ? (
                  <span className="text-green-400">{scanResults[scanner.id]}</span>
                ) : (
                  '0'
                )}
              </div>
              <div className="text-sm text-gray-400">stocks found</div>
              {scanResults[scanner.id] > 0 && (
                <button className="mt-3 text-sm text-purple-400 hover:text-purple-300 transition">
                  View Results →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
