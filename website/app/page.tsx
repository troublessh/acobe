'use client'

import createGlobe from 'cobe'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useSpring } from 'react-spring'
import { Code, Recipes, MarkersArcs, CustomLabels } from './components'
import {
  showcases,
  showcaseConfigs,
  getShowcaseMarkers,
  getShowcaseArcs,
  ShowcaseKey,
  showcaseDefaultMarkers,
  showcaseDefaultArcs,
  stickerMarkers,
  liveMarkers,
  interactiveMarkers,
  polaroidMarkers,
  pulseMarkers,
  barMarkers,
  analyticsMarkers,
  flightArcs,
  flightMarkers,
  labelMarkers,
  satelliteMarkers,
  weatherMarkers,
  cdnMarkers,
  cdnArcs,
} from './showcases-data'

const codeExample = `import createGlobe from 'cobe'

const globe = createGlobe(canvas, {
  devicePixelRatio: 2,
  width: 600 * 2,
  height: 600 * 2,
  phi: 0,
  theta: 0.2,
  dark: 0,
  diffuse: 1.2,
  mapSamples: 16000,
  mapBrightness: 6,
  baseColor: [1, 1, 1],
  markerColor: [0.2, 0.4, 1],
  glowColor: [1, 1, 1],
  markers: [
    { location: [37.78, -122.44], size: 0.03, id: 'sf' },
    { location: [40.71, -74.01], size: 0.03, id: 'nyc' },
  ],
  arcs: [
    { from: [37.78, -122.44], to: [40.71, -74.01] },
  ],
  arcColor: [0.3, 0.5, 1],
  arcWidth: 0.5,
  arcHeight: 0.3,
})

// Animate the globe
let phi = 0
function animate() {
  phi += 0.005
  globe.update({ phi })
  requestAnimationFrame(animate)
}
animate()`

const apiOptions = [
  {
    name: 'width',
    type: 'number',
    desc: 'Canvas width in pixels (use width * 2 for retina)',
    required: true,
  },
  {
    name: 'height',
    type: 'number',
    desc: 'Canvas height in pixels (use height * 2 for retina)',
    required: true,
  },
  {
    name: 'phi',
    type: 'number',
    desc: 'Horizontal rotation angle in radians (0 to 2π)',
    required: true,
  },
  {
    name: 'theta',
    type: 'number',
    desc: 'Vertical tilt angle in radians (-π/2 to π/2)',
    required: true,
  },
  {
    name: 'dark',
    type: 'number',
    desc: 'Land darkness: 0 = light mode, 1 = dark mode',
    required: true,
  },
  {
    name: 'diffuse',
    type: 'number',
    desc: 'Diffuse lighting intensity (typically 0.5 to 3)',
    required: true,
  },
  {
    name: 'mapSamples',
    type: 'number',
    desc: 'Number of dots rendering the map (1000 to 100000)',
    required: true,
  },
  {
    name: 'mapBrightness',
    type: 'number',
    desc: 'Brightness of land dots (1 to 20)',
    required: true,
  },
  {
    name: 'mapBaseBrightness',
    type: 'number',
    desc: 'Base brightness for ocean areas (0 to 1)',
  },
  {
    name: 'baseColor',
    type: '[r,g,b]',
    desc: 'Globe base color, values 0-1 (e.g. [1, 1, 1] = white)',
  },
  {
    name: 'markerColor',
    type: '[r,g,b]',
    desc: 'Default marker color, values 0-1',
  },
  {
    name: 'glowColor',
    type: '[r,g,b]',
    desc: 'Atmospheric glow color around the globe',
  },
  {
    name: 'markers',
    type: 'Marker[]',
    desc: '{ location: [lat, lon], size, color?, id? }',
  },
  {
    name: 'arcs',
    type: 'Arc[]',
    desc: '{ from: [lat, lon], to: [lat, lon], color?, id? }',
  },
  { name: 'arcColor', type: '[r,g,b]', desc: 'Default arc color, values 0-1' },
  { name: 'arcWidth', type: 'number', desc: 'Arc line thickness (0.1 to 2)' },
  {
    name: 'arcHeight',
    type: 'number',
    desc: 'Arc curve height above globe (0.1 to 0.5)',
  },
  {
    name: 'markerElevation',
    type: 'number',
    desc: 'Marker height above surface (0 to 0.2)',
  },
  { name: 'scale', type: 'number', desc: 'Globe scale multiplier (default 1)' },
  { name: 'offset', type: '[x,y]', desc: 'Pixel offset from center [x, y]' },
  { name: 'opacity', type: 'number', desc: 'Globe opacity (0 to 1)' },
  {
    name: 'devicePixelRatio',
    type: 'number',
    desc: 'Pixel density (use 2 for retina displays)',
  },
  {
    name: 'context',
    type: 'WebGLContextAttributes',
    desc: 'WebGL context options (antialias, alpha, etc.)',
  },
]

const returnedMethods = [
  {
    name: 'update(state)',
    type: 'function',
    desc: 'Updates globe state and triggers a re-render. Pass any options to update.',
  },
  {
    name: 'destroy()',
    type: 'function',
    desc: 'Releases WebGL context and stops rendering. Call when unmounting.',
  },
]

function Showcases() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeShowcase, setActiveShowcase] = useState<ShowcaseKey>('default')
  const showcaseRef = useRef<ShowcaseKey>('default')
  const [expanded, setExpanded] = useState<string | null>(null)
  const progressBarRef = useRef<HTMLSpanElement>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const velocity = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const [liveViewers, setLiveViewers] = useState(2847)
  const [cdnTraffic, setCdnTraffic] = useState(() =>
    cdnArcs.map((a, i) => ({ id: a.id, value: [420, 380, 290, 185, 156, 134][i] || 100 }))
  )
  const isPausedRef = useRef(false)
  const speedRef = useRef(1)
  const accumulatedRef = useRef(0)
  const [analyticsData, setAnalyticsData] = useState(() =>
    analyticsMarkers.map((m) => ({ ...m })),
  )

  const [spring, api] = useSpring(() => ({
    theta: showcaseConfigs.default.theta,
    dark: showcaseConfigs.default.dark,
    mapBrightness: showcaseConfigs.default.mapBrightness,
    mr: showcaseConfigs.default.markerColor[0],
    mg: showcaseConfigs.default.markerColor[1],
    mb: showcaseConfigs.default.markerColor[2],
    br: showcaseConfigs.default.baseColor[0],
    bg: showcaseConfigs.default.baseColor[1],
    bb: showcaseConfigs.default.baseColor[2],
    ar: showcaseConfigs.default.arcColor[0],
    ag: showcaseConfigs.default.arcColor[1],
    ab: showcaseConfigs.default.arcColor[2],
    markerSize: showcaseConfigs.default.markerSize,
    markerElevation: showcaseConfigs.default.markerElevation,
    config: { mass: 1, tension: 120, friction: 20 },
  }))

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerInteracting.current = { x: e.clientX, y: e.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
    isPausedRef.current = true
  }, [])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (pointerInteracting.current !== null) {
      const deltaX = e.clientX - pointerInteracting.current.x
      const deltaY = e.clientY - pointerInteracting.current.y
      dragOffset.current = { phi: deltaX / 300, theta: deltaY / 1000 }

      // Track velocity (clamped)
      const now = Date.now()
      if (lastPointer.current) {
        const dt = Math.max(now - lastPointer.current.t, 1)
        const maxVelocity = 0.15
        velocity.current = {
          phi: Math.max(
            -maxVelocity,
            Math.min(
              maxVelocity,
              ((e.clientX - lastPointer.current.x) / dt) * 0.3,
            ),
          ),
          theta: Math.max(
            -maxVelocity,
            Math.min(
              maxVelocity,
              ((e.clientY - lastPointer.current.y) / dt) * 0.08,
            ),
          ),
        }
      }
      lastPointer.current = { x: e.clientX, y: e.clientY, t: now }
    }
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
      lastPointer.current = null
    }
    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  const currentActiveShowcase = useRef<ShowcaseKey>('default')
  useEffect(() => {
    currentActiveShowcase.current = activeShowcase
  }, [activeShowcase])

  useEffect(() => {
    const duration = currentActiveShowcase.current === 'default' ? 6000 : 4000
    const interval = setInterval(() => {
      if (isPausedRef.current) return
      accumulatedRef.current += 50
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${(accumulatedRef.current / duration) * 100}%`
      }
      if (accumulatedRef.current >= duration) {
        setActiveShowcase((current) => {
          const idx = showcases.findIndex((s) => s.key === current)
          return showcases[(idx + 1) % showcases.length].key
        })
        setExpanded(null)
        accumulatedRef.current = 0
        if (progressBarRef.current) progressBarRef.current.style.width = '0%'
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // Self-updating live viewers
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveViewers((v) =>
        Math.max(100, v + Math.floor(Math.random() * 21) - 8),
      )
    }, 400)
    return () => clearInterval(interval)
  }, [])

  // Self-updating CDN traffic
  useEffect(() => {
    const interval = setInterval(() => {
      setCdnTraffic((data) =>
        data.map((t) => ({
          ...t,
          value: Math.max(50, t.value + Math.floor(Math.random() * 21) - 10),
        }))
      )
    }, 250)
    return () => clearInterval(interval)
  }, [])

  // Self-updating analytics
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalyticsData((data) =>
        data.map((m) => ({
          ...m,
          visitors: m.visitors + Math.floor(Math.random() * 11) - 3,
          trend: Math.max(
            -20,
            Math.min(20, m.trend + Math.floor(Math.random() * 5) - 2),
          ),
        })),
      )
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    showcaseRef.current = activeShowcase
    const config = showcaseConfigs[activeShowcase]
    api.start({
      theta: config.theta,
      dark: config.dark,
      mapBrightness: config.mapBrightness,
      mr: config.markerColor[0],
      mg: config.markerColor[1],
      mb: config.markerColor[2],
      br: config.baseColor[0],
      bg: config.baseColor[1],
      bb: config.baseColor[2],
      ar: config.arcColor[0],
      ag: config.arcColor[1],
      ab: config.arcColor[2],
      markerSize: config.markerSize,
      markerElevation: config.markerElevation,
    })
  }, [activeShowcase, api])

  const springRef = useRef(spring)
  useEffect(() => {
    springRef.current = spring
  }, [spring])

  useEffect(() => {
    if (!canvasRef.current) return
    let phi = 0
    const width = canvasRef.current.offsetWidth

    const markerArrays: Record<
      ShowcaseKey,
      { id: string; location: [number, number] }[]
    > = {
      default: showcaseDefaultMarkers,
      stickers: stickerMarkers,
      live: liveMarkers,
      interactive: interactiveMarkers,
      polaroids: polaroidMarkers,
      pulse: pulseMarkers,
      bars: barMarkers,
      analytics: analyticsMarkers,
      flights: flightMarkers,
      labels: labelMarkers,
      satellites: satelliteMarkers,
      weather: weatherMarkers,
      cdn: cdnMarkers,
    }

    // Pre-build arc arrays (static)
    const defaultArcs = showcaseDefaultArcs.map((a) => ({
      from: a.from,
      to: a.to,
      id: a.id,
    }))
    const flightArcsData = flightArcs.map((a) => ({
      from: a.from,
      to: a.to,
      id: a.id,
    }))
    const cdnArcsData = cdnArcs.map((a) => ({
      from: a.from,
      to: a.to,
      id: a.id,
    }))
    const emptyArcs: typeof defaultArcs = []

    // Cache for markers with size
    let cachedShowcase: ShowcaseKey | null = null
    let cachedSize = 0
    let cachedMarkers: {
      location: [number, number]
      size: number
      id: string
    }[] = []

    const getMarkers = () => {
      const s = showcaseRef.current
      const size = springRef.current.markerSize.get()
      // Return cached if same showcase and size hasn't changed much
      if (s === cachedShowcase && Math.abs(size - cachedSize) < 0.001) {
        return cachedMarkers
      }
      const arr = markerArrays[s]
      if (!arr) return []
      cachedShowcase = s
      cachedSize = size
      cachedMarkers = arr.map((m) => ({
        location: m.location,
        size,
        id: m.id,
      }))
      return cachedMarkers
    }

    const getArcs = () => {
      const s = showcaseRef.current
      if (s === 'default') return defaultArcs
      if (s === 'flights') return flightArcsData
      if (s === 'cdn') return cdnArcsData
      return emptyArcs
    }

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      window.innerWidth < 640 ? 1.8 : 2,
    )
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: dpr,
      width: width,
      height: width,
      phi: 0,
      theta: 0.2,
      dark: 0,
      diffuse: 1.5,
      mapSamples: 16000,
      mapBrightness: 10,
      baseColor: [1, 1, 1],
      markerColor: [0.3, 0.45, 0.85],
      glowColor: [0.94, 0.93, 0.91],
      markerElevation: 0.01,
      markers: getMarkers(),
      arcs: getArcs(),
      arcColor: [0.3, 0.45, 0.85],
      arcWidth: 0.5,
      arcHeight: 0.25,
      opacity: 0.7,
    })

    let animationId: number
    function animate() {
      const s = springRef.current
      if (!isPausedRef.current) {
        phi += 0.003 * speedRef.current
        // Apply momentum with decay
        if (
          Math.abs(velocity.current.phi) > 0.0001 ||
          Math.abs(velocity.current.theta) > 0.0001
        ) {
          phiOffsetRef.current += velocity.current.phi
          thetaOffsetRef.current += velocity.current.theta
          velocity.current.phi *= 0.95
          velocity.current.theta *= 0.95
        }
        // Soft spring back for theta limits
        const thetaMin = -0.4,
          thetaMax = 0.4
        if (thetaOffsetRef.current < thetaMin) {
          thetaOffsetRef.current += (thetaMin - thetaOffsetRef.current) * 0.1
        } else if (thetaOffsetRef.current > thetaMax) {
          thetaOffsetRef.current += (thetaMax - thetaOffsetRef.current) * 0.1
        }
      }
      globe.update({
        phi: phi + phiOffsetRef.current + dragOffset.current.phi,
        theta:
          s.theta.get() + thetaOffsetRef.current + dragOffset.current.theta,
        dark: s.dark.get(),
        mapBrightness: s.mapBrightness.get(),
        markerColor: [s.mr.get(), s.mg.get(), s.mb.get()],
        baseColor: [s.br.get(), s.bg.get(), s.bb.get()],
        arcColor: [s.ar.get(), s.ag.get(), s.ab.get()],
        markerElevation: s.markerElevation.get(),
        markers: getMarkers(),
        arcs: getArcs(),
      })
      animationId = requestAnimationFrame(animate)
    }
    animate()

    setTimeout(
      () => canvasRef.current && (canvasRef.current.style.opacity = '1'),
    )
    return () => {
      cancelAnimationFrame(animationId)
      globe.destroy()
    }
  }, [])

  return (
    <section className='hero'>
      <div className='showcases-demo'>
        <div className='showcases-globe'>
          <svg width='0' height='0' style={{ position: 'absolute' }}>
            <defs>
              <filter id='sticker-outline'>
                <feMorphology
                  in='SourceAlpha'
                  result='Dilated'
                  operator='dilate'
                  radius='2'
                />
                <feFlood floodColor='#ffffff' result='OutlineColor' />
                <feComposite
                  in='OutlineColor'
                  in2='Dilated'
                  operator='in'
                  result='Outline'
                />
                <feMerge>
                  <feMergeNode in='Outline' />
                  <feMergeNode in='SourceGraphic' />
                </feMerge>
              </filter>
            </defs>
          </svg>
          <canvas
            ref={canvasRef}
            className='showcases-canvas'
            onPointerDown={handlePointerDown}
            onPointerEnter={() => (speedRef.current = 0.8)}
            onPointerLeave={() => (speedRef.current = 1)}
          />

          {/* Default */}
          {activeShowcase === 'default' && (
            <>
              <div className='globe-overlay'>
                <h1>ACOBE</h1>
              </div>
              <div className='orbit-ring' aria-hidden='true'>
                <svg className='orbit-svg' viewBox='0 0 300 300'>
                  <defs>
                    <path
                      id='showcaseOrbitPath'
                      d='M 150,150 m -130,0 a 130,130 0 1,0 260,0 a 130,130 0 1,0 -260,0'
                    />
                  </defs>
                  <text className='orbit-text'>
                    <textPath href='#showcaseOrbitPath'>
                      {'The 5KB Globe Lib · '.repeat(10)}
                    </textPath>
                  </text>
                </svg>
              </div>
              {showcaseDefaultMarkers.map((m) => (
                <div
                  key={m.id}
                  className='showcase-default-label'
                  style={
                    {
                      positionAnchor: `--cobe-${m.id}`,
                      opacity: `var(--cobe-visible-${m.id}, 0)`,
                      filter: `blur(var(--cobe-visible-${m.id}, 10px))`,
                    } as React.CSSProperties
                  }
                >
                  {m.label}
                </div>
              ))}
              {showcaseDefaultArcs.map((a) => (
                <div
                  key={a.id}
                  className='arc-label'
                  style={
                    {
                      positionAnchor: `--cobe-arc-${a.id}`,
                      opacity: `var(--cobe-visible-arc-${a.id}, 0)`,
                      filter: `blur(var(--cobe-visible-arc-${a.id}, 10px))`,
                    } as React.CSSProperties
                  }
                >
                  {a.label}
                </div>
              ))}
            </>
          )}

          {/* Stickers */}
          {activeShowcase === 'stickers' &&
            stickerMarkers.map((m) => (
              <div
                key={m.id}
                className='showcase-sticker'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                  } as React.CSSProperties
                }
              >
                {m.sticker}
              </div>
            ))}

          {/* Live Badge */}
          {activeShowcase === 'live' &&
            liveMarkers.map((m, i) => (
              <div
                key={m.id}
                className='showcase-live'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                  } as React.CSSProperties
                }
              >
                <span className='showcase-live-dot' />
                <span className='showcase-live-text'>LIVE</span>
                <span className='showcase-live-viewers'>
                  {Math.floor(
                    liveViewers * (0.3 + 0.7 * Math.pow(0.6, i)),
                  ).toLocaleString()}{' '}
                  watching
                </span>
              </div>
            ))}

          {/* Interactive Markers */}
          {activeShowcase === 'interactive' &&
            interactiveMarkers.map((m) => (
              <div
                key={m.id}
                className={`showcase-interactive ${expanded === m.id ? 'expanded' : ''}`}
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                  } as React.CSSProperties
                }
                onClick={() => setExpanded(expanded === m.id ? null : m.id)}
              >
                <span className='showcase-interactive-name'>{m.name}</span>
                {expanded === m.id && (
                  <span className='showcase-interactive-detail'>
                    {m.users.toLocaleString()} users
                  </span>
                )}
              </div>
            ))}

          {/* Polaroids */}
          {activeShowcase === 'polaroids' &&
            polaroidMarkers.map((m) => (
              <div
                key={m.id}
                className='showcase-polaroid'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                    '--polaroid-rotate': `${m.rotate}deg`,
                  } as React.CSSProperties
                }
              >
                <img src={m.image} alt={m.caption} />
                <span className='showcase-polaroid-caption'>{m.caption}</span>
              </div>
            ))}

          {/* Pulse */}
          {activeShowcase === 'pulse' &&
            pulseMarkers.map((m) => (
              <div
                key={m.id}
                className='showcase-pulse'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                    '--delay': `${m.delay}s`,
                  } as React.CSSProperties
                }
              >
                <span className='showcase-pulse-ring' />
                <span className='showcase-pulse-ring' />
                <span className='showcase-pulse-dot' />
              </div>
            ))}

          {/* Bars */}
          {activeShowcase === 'bars' &&
            barMarkers.map((m) => (
              <div
                key={m.id}
                className='showcase-bar'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                  } as React.CSSProperties
                }
              >
                <span className='showcase-bar-label'>{m.label}</span>
                <span className='showcase-bar-track'>
                  <span
                    className='showcase-bar-fill'
                    style={{ '--value': `${m.value}%` } as React.CSSProperties}
                  />
                </span>
                <span className='showcase-bar-value'>{m.value}%</span>
              </div>
            ))}

          {/* Analytics */}
          {activeShowcase === 'analytics' &&
            analyticsData.map((m) => (
              <div
                key={m.id}
                className='showcase-analytics'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                  } as React.CSSProperties
                }
              >
                <span className='showcase-analytics-count'>{m.visitors}</span>
                <span
                  className={`showcase-analytics-trend ${m.trend >= 0 ? 'up' : 'down'}`}
                >
                  {m.trend >= 0 ? '↑' : '↓'} {Math.abs(m.trend)}%
                </span>
              </div>
            ))}

          {/* Flights */}
          {activeShowcase === 'flights' &&
            flightArcs.map((a) => (
              <div
                key={a.id}
                className='showcase-flight'
                style={
                  {
                    positionAnchor: `--cobe-arc-${a.id}`,
                    opacity: `var(--cobe-visible-arc-${a.id}, 0)`,
                    // filter: `blur(calc((1 - var(--cobe-visible-arc-${a.id}, 0)) * 8px))`,
                  } as React.CSSProperties
                }
              >
                ✈️
              </div>
            ))}

          {/* Labels */}
          {activeShowcase === 'labels' &&
            labelMarkers.map((m) => (
              <div
                key={m.id}
                className='showcase-label'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                    '--label-color': m.color,
                    '--label-rotate': `${m.rotate}deg`,
                  } as React.CSSProperties
                }
              >
                {m.text}
              </div>
            ))}

          {/* Satellites */}
          {activeShowcase === 'satellites' &&
            satelliteMarkers.map((m) => (
              <div
                key={m.id}
                className='showcase-satellite'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                  } as React.CSSProperties
                }
              >
                🛰️
              </div>
            ))}

          {/* CDN */}
          {activeShowcase === 'cdn' && (
            <>
              {cdnMarkers.map((m) => (
                <div
                  key={m.id}
                  className='showcase-cdn'
                  style={
                    {
                      positionAnchor: `--cobe-${m.id}`,
                      opacity: `var(--cobe-visible-${m.id}, 0)`,
                      filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                    } as React.CSSProperties
                  }
                >
                  <div className='showcase-cdn-pyramid'>
                    <div className='showcase-cdn-pyramid-face' />
                    <div className='showcase-cdn-pyramid-face' />
                    <div className='showcase-cdn-pyramid-face' />
                    <div className='showcase-cdn-pyramid-face' />
                  </div>
                  <span className='showcase-cdn-label'>{m.region}</span>
                </div>
              ))}
              {cdnTraffic.map((t) => (
                <div
                  key={t.id}
                  className='showcase-cdn-arc-label'
                  style={
                    {
                      positionAnchor: `--cobe-arc-${t.id}`,
                      opacity: `var(--cobe-visible-arc-${t.id}, 0)`,
                      filter: `blur(calc((1 - var(--cobe-visible-arc-${t.id}, 0)) * 8px))`,
                    } as React.CSSProperties
                  }
                >
                  {t.value}k req/s
                </div>
              ))}
            </>
          )}

          {/* Weather */}
          {activeShowcase === 'weather' &&
            weatherMarkers.map((m) => (
              <div
                key={m.id}
                className='showcase-weather'
                style={
                  {
                    positionAnchor: `--cobe-${m.id}`,
                    opacity: `var(--cobe-visible-${m.id}, 0)`,
                    filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 8px))`,
                  } as React.CSSProperties
                }
              >
                {m.emoji}
              </div>
            ))}
        </div>

        <div className='showcases-controls'>
          <div className='showcase-title'>
            {showcases.find((s) => s.key === activeShowcase)?.name}
          </div>
          <div className='showcase-indicators'>
            {showcases.map((s) => (
              <button
                key={s.key}
                className={`showcase-dot ${activeShowcase === s.key ? 'active' : ''}`}
                onClick={() => {
                  setActiveShowcase(s.key)
                  setExpanded(null)
                  accumulatedRef.current = 0
                  if (progressBarRef.current)
                    progressBarRef.current.style.width = '0%'
                }}
                aria-label={s.name}
              >
                <span className='showcase-dot-inner' />
                <span className='showcase-dot-label'>{s.name}</span>
              </button>
            ))}
          </div>
          <div className='showcase-progress'>
            <span ref={progressBarRef} className='showcase-progress-bar' />
          </div>
          <div className='showcase-nav'>
            <button
              className='showcase-nav-btn'
              onClick={() => {
                const idx = showcases.findIndex((s) => s.key === activeShowcase)
                setActiveShowcase(
                  showcases[(idx - 1 + showcases.length) % showcases.length]
                    .key,
                )
                setExpanded(null)
                accumulatedRef.current = 0
                if (progressBarRef.current)
                  progressBarRef.current.style.width = '0%'
              }}
              aria-label='Previous'
            >
              ←
            </button>
            <span className='showcase-count'>
              {showcases.findIndex((s) => s.key === activeShowcase) + 1} /{' '}
              {showcases.length}
            </span>
            <button
              className='showcase-nav-btn'
              onClick={() => {
                const idx = showcases.findIndex((s) => s.key === activeShowcase)
                setActiveShowcase(showcases[(idx + 1) % showcases.length].key)
                setExpanded(null)
                accumulatedRef.current = 0
                if (progressBarRef.current)
                  progressBarRef.current.style.width = '0%'
              }}
              aria-label='Next'
            >
              →
            </button>
          </div>
        </div>
      </div>
      <p className='hero-tagline'>COBE: The 5KB WebGL globe</p>
    </section>
  )
}


export default function Home() {
  const [copied, setCopied] = useState(false)


  return (
    <div className='page'>
      {/* Hero - Showcases */}
      <Showcases />

    

      {/* Footer */}
      <footer className='footer'>
        <div className='footer-links'>
          <a
            href='https://github.com/shuding/cobe'
            target='_blank'
            rel='noopener'
          >
            GitHub
          </a>
          <span className='footer-links-sep'>/</span>
          <a href='https://x.com/shuding' target='_blank' rel='noopener'>
            @shuding
          </a>
          <span className='footer-links-sep'>/</span>
          <a
            href='https://x.com/shuding/status/1475916082875666441'
            target='_blank'
            rel='noopener'
          >
            Tech Details →
          </a>
        </div>
      </footer>
    </div>
  )
}
