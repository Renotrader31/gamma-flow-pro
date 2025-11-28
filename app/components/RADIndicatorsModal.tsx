'use client'
import React, { useState, useEffect } from 'react'
import {
  X,
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Eye,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Waves,
  Magnet,
  Layers
} from 'lucide-react'
import type { RADIndicatorResult, TANKInjection, MagnetPriceZone, StrikeAnalysis } from '../lib/rad-indicators'

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const formatNumber = (num: number | null | undefined, decimals: number = 2): string => {
  if (num === null || num === undefined) return 'N/A'
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toFixed(decimals)
}

const formatPrice = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return 'N/A'
  return `$${num.toFixed(2)}`
}

const getSignalColor = (signal: string): string => {
  if (signal.includes('buy') || signal.includes('bullish')) return 'text-green-400'
  if (signal.includes('sell') || signal.includes('bearish')) return 'text-red-400'
  if (signal.includes('hold') || signal.includes('neutral')) return 'text-yellow-400'
  return 'text-gray-400'
}

const getSignalBg = (signal: string): string => {
  if (signal.includes('buy') || signal.includes('bullish')) return 'bg-green-500/20 border-green-500/50'
  if (signal.includes('sell') || signal.includes('bearish')) return 'bg-red-500/20 border-red-500/50'
  if (signal.includes('hold') || signal.includes('neutral')) return 'bg-yellow-500/20 border-yellow-500/50'
  return 'bg-gray-500/20 border-gray-500/50'
}

// ═══════════════════════════════════════════════════════════════════════════
// RAD CHART COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const RADChartSection = ({ rad }: { rad: RADIndicatorResult['rad'] }) => {
  const latestPattern = rad.patterns[0]

  const getPhaseIcon = () => {
    switch (rad.currentPhase) {
      case 'dip': return <TrendingDown className="w-4 h-4 text-red-400" />
      case 'recovery': return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'consolidation': return <Minus className="w-4 h-4 text-yellow-400" />
      case 'breakout': return <Zap className="w-4 h-4 text-purple-400" />
      default: return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getPhaseColor = () => {
    switch (rad.currentPhase) {
      case 'dip': return 'text-red-400 bg-red-500/20'
      case 'recovery': return 'text-green-400 bg-green-500/20'
      case 'consolidation': return 'text-yellow-400 bg-yellow-500/20'
      case 'breakout': return 'text-purple-400 bg-purple-500/20'
      default: return 'text-gray-400 bg-gray-500/20'
    }
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          RAD Chart (Resistance After Dip)
        </h4>
        <div className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${getPhaseColor()}`}>
          {getPhaseIcon()}
          {rad.currentPhase.toUpperCase()}
        </div>
      </div>

      {/* Pattern Visualization */}
      {latestPattern ? (
        <div className="space-y-3">
          {/* Visual Progress Bar */}
          <div className="relative h-8 bg-gray-900 rounded overflow-hidden">
            {/* Dip zone */}
            <div
              className="absolute h-full bg-red-500/30"
              style={{ width: '30%', left: '0%' }}
            />
            {/* Recovery zone */}
            <div
              className="absolute h-full bg-green-500/30"
              style={{ width: `${Math.min(latestPattern.recoveryPercent / latestPattern.dipDepth * 40, 40)}%`, left: '30%' }}
            />
            {/* Current position marker */}
            <div
              className="absolute top-1 bottom-1 w-1 bg-white rounded"
              style={{ left: `${30 + latestPattern.recoveryPercent / latestPattern.dipDepth * 40}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
              <span className="text-red-400">Dip: -{latestPattern.dipDepth.toFixed(1)}%</span>
              <span className="text-green-400">Recovery: +{latestPattern.recoveryPercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* Pattern Details */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-gray-900 p-2 rounded">
              <div className="text-gray-500">Pre-Dip High</div>
              <div className="text-white font-mono">{formatPrice(latestPattern.preDipHigh)}</div>
            </div>
            <div className="bg-gray-900 p-2 rounded">
              <div className="text-gray-500">Dip Low</div>
              <div className="text-red-400 font-mono">{formatPrice(latestPattern.dipLow)}</div>
            </div>
            <div className="bg-gray-900 p-2 rounded">
              <div className="text-gray-500">Volume Profile</div>
              <div className={latestPattern.volumeProfile === 'increasing' ? 'text-green-400' : latestPattern.volumeProfile === 'decreasing' ? 'text-red-400' : 'text-yellow-400'}>
                {latestPattern.volumeProfile.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Support/Resistance Levels */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Resistance Levels</div>
              <div className="space-y-1">
                {latestPattern.resistanceLevels.slice(0, 3).map((level, i) => (
                  <div key={i} className="flex justify-between text-xs bg-red-500/10 px-2 py-1 rounded">
                    <span className="text-red-400">R{i + 1}</span>
                    <span className="text-white font-mono">{formatPrice(level)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Support Levels</div>
              <div className="space-y-1">
                {latestPattern.supportLevels.slice(0, 3).map((level, i) => (
                  <div key={i} className="flex justify-between text-xs bg-green-500/10 px-2 py-1 rounded">
                    <span className="text-green-400">S{i + 1}</span>
                    <span className="text-white font-mono">{formatPrice(level)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Signal */}
          <div className={`p-2 rounded border ${getSignalBg(latestPattern.signal)}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${getSignalColor(latestPattern.signal)}`}>
                {latestPattern.signal.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-xs text-gray-400">
                Strength: {latestPattern.strength}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm">
          No significant RAD patterns detected
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TANK CHART COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const TANKChartSection = ({ tank }: { tank: RADIndicatorResult['tank'] }) => {
  const strengthColor = tank.currentStrength > 20 ? 'text-green-400' :
                        tank.currentStrength < -20 ? 'text-red-400' : 'text-yellow-400'

  const strengthBg = tank.currentStrength > 20 ? 'bg-green-500' :
                     tank.currentStrength < -20 ? 'bg-red-500' : 'bg-yellow-500'

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
          <Waves className="w-4 h-4" />
          TANK Chart (Order Flow)
        </h4>
        <div className="text-xs text-gray-500">
          Dark Pool: {tank.darkPoolPercent.toFixed(1)}%
        </div>
      </div>

      {/* Strength Gauge */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-red-400">SELL</span>
          <span className={strengthColor}>{tank.currentStrength > 0 ? '+' : ''}{tank.currentStrength}</span>
          <span className="text-green-400">BUY</span>
        </div>
        <div className="h-3 bg-gray-900 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 bg-gradient-to-r from-red-500/50 to-transparent" />
            <div className="w-1/2 bg-gradient-to-l from-green-500/50 to-transparent" />
          </div>
          {/* Current strength marker */}
          <div
            className={`absolute top-0 bottom-0 w-2 ${strengthBg} rounded`}
            style={{ left: `${50 + tank.currentStrength / 2}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1 text-gray-500">
          <span>-100</span>
          <span className="text-gray-400">Trend: {tank.strengthTrend.toUpperCase()}</span>
          <span>+100</span>
        </div>
      </div>

      {/* Flow Summary */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div className="bg-gray-900 p-2 rounded text-center">
          <div className="text-gray-500">Buy Wall</div>
          <div className="text-green-400 font-mono">{formatNumber(tank.buyWallStrength)}</div>
        </div>
        <div className="bg-gray-900 p-2 rounded text-center">
          <div className="text-gray-500">Dominant</div>
          <div className={tank.dominantFlow === 'buyers' ? 'text-green-400' :
                         tank.dominantFlow === 'sellers' ? 'text-red-400' : 'text-yellow-400'}>
            {tank.dominantFlow.toUpperCase()}
          </div>
        </div>
        <div className="bg-gray-900 p-2 rounded text-center">
          <div className="text-gray-500">Sell Wall</div>
          <div className="text-red-400 font-mono">{formatNumber(tank.sellWallStrength)}</div>
        </div>
      </div>

      {/* TANK Table - Recent Injections */}
      <div className="mt-3">
        <div className="text-xs text-gray-500 mb-2">Recent Market Injections (2-min intervals)</div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {tank.injections.slice(-8).reverse().map((inj, i) => (
            <div
              key={i}
              className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                inj.type === 'buy' ? 'bg-green-500/10' :
                inj.type === 'sell' ? 'bg-red-500/10' : 'bg-purple-500/10'
              }`}
            >
              <span className="text-gray-400 w-14">{inj.timeLabel}</span>
              <span className={
                inj.type === 'buy' ? 'text-green-400' :
                inj.type === 'sell' ? 'text-red-400' : 'text-purple-400'
              }>
                {inj.type === 'dark_pool' ? 'DARK' : inj.type.toUpperCase()}
              </span>
              <span className="text-white font-mono w-16 text-right">{formatNumber(inj.volume)}</span>
              <span className={`w-16 text-right ${
                inj.strength === 'extreme' ? 'text-yellow-400 font-bold' :
                inj.strength === 'strong' ? 'text-orange-400' : 'text-gray-400'
              }`}>
                {inj.strength.toUpperCase()}
              </span>
            </div>
          ))}
          {tank.injections.length === 0 && (
            <div className="text-center text-gray-500 py-2">No significant injections</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MP/LP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const MPLPSection = ({ mplp, currentPrice }: { mplp: RADIndicatorResult['mplp']; currentPrice: number }) => {
  const gravityIcon = mplp.expectedGravity.includes('up') ?
    <ArrowUp className="w-4 h-4" /> :
    mplp.expectedGravity.includes('down') ?
    <ArrowDown className="w-4 h-4" /> :
    <Minus className="w-4 h-4" />

  const gravityColor = mplp.expectedGravity.includes('up') ? 'text-green-400' :
                       mplp.expectedGravity.includes('down') ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-pink-400 flex items-center gap-2">
          <Magnet className="w-4 h-4" />
          MP/LP (Magnet Price & Liquidity Pull)
        </h4>
        <div className={`flex items-center gap-1 ${gravityColor}`}>
          {gravityIcon}
          <span className="text-xs">{mplp.expectedGravity.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
      </div>

      {/* Key Prices */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-4">
        <div className="bg-pink-500/10 border border-pink-500/30 p-2 rounded text-center">
          <div className="text-pink-400 mb-1">Magnet Price</div>
          <div className="text-white font-mono text-lg">{formatPrice(mplp.magnetPrice)}</div>
          <div className="text-gray-500">
            {((mplp.magnetPrice - currentPrice) / currentPrice * 100).toFixed(1)}% away
          </div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-2 rounded text-center">
          <div className="text-yellow-400 mb-1">Max Pain</div>
          <div className="text-white font-mono text-lg">{formatPrice(mplp.maxPainPrice)}</div>
          <div className="text-gray-500">
            {((mplp.maxPainPrice - currentPrice) / currentPrice * 100).toFixed(1)}% away
          </div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 p-2 rounded text-center">
          <div className="text-purple-400 mb-1">Price Target</div>
          <div className="text-white font-mono text-lg">{formatPrice(mplp.priceTarget)}</div>
          <div className="text-gray-500">
            {mplp.confidence.toFixed(0)}% confidence
          </div>
        </div>
      </div>

      {/* Liquidity Pull Zones */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Liquidity Pull Zones (by OI)</div>
        <div className="space-y-1">
          {mplp.liquidityPullZones.slice(0, 5).map((zone, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-gray-900 px-2 py-1.5 rounded">
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3 text-pink-400" />
                <span className="text-white font-mono">{formatPrice(zone.price)}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20">
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500"
                      style={{ width: `${zone.strength}%` }}
                    />
                  </div>
                </div>
                <span className={zone.distancePercent > 0 ? 'text-green-400' : 'text-red-400'}>
                  {zone.distancePercent > 0 ? '+' : ''}{zone.distancePercent.toFixed(1)}%
                </span>
                <span className="text-gray-500 w-16 text-right">OI: {formatNumber(zone.openInterest)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gamma Flip Level */}
      <div className="mt-3 p-2 bg-gray-900 rounded flex justify-between items-center text-xs">
        <span className="text-gray-400">Gamma Flip Level</span>
        <span className={`font-mono ${currentPrice > mplp.gammaFlipLevel ? 'text-red-400' : 'text-green-400'}`}>
          {formatPrice(mplp.gammaFlipLevel)}
          <span className="text-gray-500 ml-2">
            ({currentPrice > mplp.gammaFlipLevel ? 'Short Gamma' : 'Long Gamma'})
          </span>
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// OSV COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const OSVSection = ({ osv }: { osv: RADIndicatorResult['osv'] }) => {
  const sentimentColor = osv.dominantSentiment === 'bullish' ? 'text-green-400' :
                         osv.dominantSentiment === 'bearish' ? 'text-red-400' : 'text-yellow-400'

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          OSV (Options Strike Volume)
        </h4>
        <div className={`text-xs ${sentimentColor}`}>
          {osv.dominantSentiment.toUpperCase()} SENTIMENT
        </div>
      </div>

      {/* Expected Range */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">Expected Price Range</div>
        <div className="relative h-8 bg-gray-900 rounded-lg overflow-hidden">
          {/* Range visualization */}
          <div
            className="absolute h-full bg-blue-500/30"
            style={{
              left: `${Math.max(0, (osv.expectedRange.low / osv.currentPrice - 0.9) * 500)}%`,
              width: `${Math.min(100, (osv.expectedRange.high - osv.expectedRange.low) / osv.currentPrice * 500)}%`
            }}
          />
          {/* Current price marker */}
          <div
            className="absolute top-1 bottom-1 w-0.5 bg-white"
            style={{ left: '50%' }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs">
            <span className="text-red-400">{formatPrice(osv.expectedRange.low)}</span>
            <span className="text-white">{formatPrice(osv.currentPrice)}</span>
            <span className="text-green-400">{formatPrice(osv.expectedRange.high)}</span>
          </div>
        </div>
      </div>

      {/* Key Strikes */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-green-500/10 border border-green-500/30 p-2 rounded">
          <div className="text-xs text-green-400">Strongest Bull Strike</div>
          <div className="text-white font-mono">{formatPrice(osv.strongestBullStrike)}</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 p-2 rounded">
          <div className="text-xs text-red-400">Strongest Bear Strike</div>
          <div className="text-white font-mono">{formatPrice(osv.strongestBearStrike)}</div>
        </div>
      </div>

      {/* Loading Zones */}
      {osv.loadingZones.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            Loading Zones (High Volume/OI Ratio)
          </div>
          <div className="flex flex-wrap gap-1">
            {osv.loadingZones.map((strike, i) => (
              <span key={i} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                {formatPrice(strike)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strike Analysis Table */}
      <div>
        <div className="text-xs text-gray-500 mb-2">Strike Analysis (Near ATM)</div>
        <div className="max-h-36 overflow-y-auto">
          <div className="space-y-1">
            {osv.strikes
              .filter(s => Math.abs(s.strike - osv.currentPrice) / osv.currentPrice < 0.05)
              .slice(0, 7)
              .map((strike, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-900 px-2 py-1.5 rounded">
                  <span className={`font-mono ${strike.strike === osv.currentPrice ? 'text-blue-400' : 'text-white'}`}>
                    {formatPrice(strike.strike)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">C:{formatNumber(strike.callVolume, 0)}</span>
                    <span className="text-red-400">P:{formatNumber(strike.putVolume, 0)}</span>
                    {strike.loadingZone && (
                      <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSITE SCORE DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

const CompositeScoreDisplay = ({
  score,
  signal
}: {
  score: number
  signal: RADIndicatorResult['actionSignal']
}) => {
  const scoreColor = score > 30 ? 'text-green-400' :
                     score < -30 ? 'text-red-400' : 'text-yellow-400'

  const scoreBg = score > 30 ? 'from-green-500/20 to-transparent' :
                  score < -30 ? 'from-red-500/20 to-transparent' : 'from-yellow-500/20 to-transparent'

  const signalEmoji = signal === 'strong_buy' ? '🚀' :
                      signal === 'buy' ? '📈' :
                      signal === 'sell' ? '📉' :
                      signal === 'strong_sell' ? '💀' : '⚖️'

  return (
    <div className={`bg-gradient-to-r ${scoreBg} rounded-lg p-4 border border-gray-700`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-1">Composite RAD Score</div>
          <div className={`text-4xl font-bold ${scoreColor}`}>
            {score > 0 ? '+' : ''}{score}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Action Signal</div>
          <div className={`text-2xl font-bold ${getSignalColor(signal)} flex items-center gap-2`}>
            <span>{signalEmoji}</span>
            <span>{signal.replace(/_/g, ' ').toUpperCase()}</span>
          </div>
        </div>
      </div>
      {/* Score bar */}
      <div className="mt-3">
        <div className="h-2 bg-gray-900 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 bg-gradient-to-r from-red-500/30 via-yellow-500/30 to-transparent" />
            <div className="w-1/2 bg-gradient-to-l from-green-500/30 via-yellow-500/30 to-transparent" />
          </div>
          <div
            className={`absolute top-0 bottom-0 w-3 rounded ${
              score > 0 ? 'bg-green-500' : score < 0 ? 'bg-red-500' : 'bg-yellow-500'
            }`}
            style={{ left: `${50 + score / 2}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Strong Sell</span>
          <span>Hold</span>
          <span>Strong Buy</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface RADIndicatorsModalProps {
  symbol: string
  currentPrice: number
  onClose: () => void
}

export const RADIndicatorsModal: React.FC<RADIndicatorsModalProps> = ({
  symbol,
  currentPrice,
  onClose
}) => {
  const [data, setData] = useState<RADIndicatorResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'rad' | 'tank' | 'mplp' | 'osv'>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(`/api/rad-indicators?symbol=${symbol}`)
        if (!response.ok) {
          throw new Error('Failed to fetch RAD indicators')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [symbol])

  const handleRefresh = () => {
    setLoading(true)
    fetch(`/api/rad-indicators?symbol=${symbol}`)
      .then(res => res.json())
      .then(result => setData(result))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {symbol} - RAD Indicators
              </h2>
              <p className="text-sm text-gray-400">
                Resistance After Dip • TANK • MP/LP • OSV
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {(['all', 'rad', 'tank', 'mplp', 'osv'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-cyan-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All Indicators' :
               tab === 'rad' ? 'RAD Chart' :
               tab === 'tank' ? 'TANK' :
               tab === 'mplp' ? 'MP/LP' : 'OSV'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="text-gray-400">Loading RAD indicators...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-red-400">
                <AlertTriangle className="w-8 h-8" />
                <span>{error}</span>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-4">
              {/* Composite Score - Always visible */}
              {(activeTab === 'all') && (
                <CompositeScoreDisplay
                  score={data.compositeScore}
                  signal={data.actionSignal}
                />
              )}

              {/* Individual Sections */}
              <div className={`grid gap-4 ${activeTab === 'all' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {(activeTab === 'all' || activeTab === 'rad') && (
                  <RADChartSection rad={data.rad} />
                )}
                {(activeTab === 'all' || activeTab === 'tank') && (
                  <TANKChartSection tank={data.tank} />
                )}
                {(activeTab === 'all' || activeTab === 'mplp') && (
                  <MPLPSection mplp={data.mplp} currentPrice={data.osv.currentPrice} />
                )}
                {(activeTab === 'all' || activeTab === 'osv') && (
                  <OSVSection osv={data.osv} />
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <span>Updated: {data ? new Date(data.timestamp).toLocaleTimeString() : 'N/A'}</span>
          <span>Powered by RAD Indicator System</span>
        </div>
      </div>
    </div>
  )
}

export default RADIndicatorsModal
