'use client'

import React from 'react'
import { Activity, Wifi, WifiOff } from 'lucide-react'

interface RealtimeIndicatorProps {
  isConnected: boolean
  lastUpdate?: string
  isLoading?: boolean
}

export function RealtimeIndicator({ isConnected, lastUpdate, isLoading }: RealtimeIndicatorProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <div className="relative">
              <Wifi className="w-4 h-4 text-green-400" />
              {isLoading && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              )}
            </div>
            <span className="text-green-400">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Offline</span>
          </>
        )}
      </div>

      {lastUpdate && (
        <div className="flex items-center gap-2 text-gray-400">
          <Activity className="w-3 h-3" />
          <span className="text-xs">
            Updated: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  )
}