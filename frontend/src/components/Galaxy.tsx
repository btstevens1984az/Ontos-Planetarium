import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { GraphEdge, GraphNode } from '../api'

export type GalaxyHandle = {
  zoomIn: () => void
  zoomOut: () => void
  recenter: () => void
}

type Props = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  highlightIds: string[]
  selectedId: string | null
  onSelect: (node: GraphNode | null) => void
}

const KIND_COLOR: Record<string, string> = {
  host: '#3ec7e8',
  service: '#3dcf8e',
  listener: '#f0a35a',
  endpoint: '#f0a35a',
  cert: '#f0c36a',
  process: '#7aa7ff',
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  icon: string,
  cx: number,
  cy: number,
  color: string,
  scale: number,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.55 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const s = 4.6 * scale

  if (icon === 'server' || icon === 'database') {
    ctx.strokeRect(cx - s, cy - s * 1.05, s * 2, s * 2.1)
    ctx.beginPath()
    ctx.moveTo(cx - s, cy - s * 0.3)
    ctx.lineTo(cx + s, cy - s * 0.3)
    ctx.moveTo(cx - s, cy + s * 0.35)
    ctx.lineTo(cx + s, cy + s * 0.35)
    ctx.stroke()
  } else if (icon === 'lock') {
    ctx.strokeRect(cx - s * 0.7, cy - s * 0.05, s * 1.4, s * 1.15)
    ctx.beginPath()
    ctx.arc(cx, cy - s * 0.05, s * 0.52, Math.PI, 0)
    ctx.stroke()
  } else if (icon === 'shield') {
    ctx.beginPath()
    ctx.moveTo(cx, cy - s)
    ctx.lineTo(cx + s, cy - s * 0.45)
    ctx.lineTo(cx + s * 0.85, cy + s * 0.55)
    ctx.lineTo(cx, cy + s)
    ctx.lineTo(cx - s * 0.85, cy + s * 0.55)
    ctx.lineTo(cx - s, cy - s * 0.45)
    ctx.closePath()
    ctx.stroke()
  } else if (icon === 'gateway') {
    ctx.beginPath()
    ctx.moveTo(cx, cy - s)
    ctx.lineTo(cx + s, cy)
    ctx.lineTo(cx, cy + s)
    ctx.lineTo(cx - s, cy)
    ctx.closePath()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2)
    ctx.stroke()
  } else if (icon === 'cloud') {
    ctx.beginPath()
    ctx.arc(cx - s * 0.4, cy + s * 0.15, s * 0.65, 0, Math.PI * 2)
    ctx.arc(cx + s * 0.4, cy, s * 0.8, 0, Math.PI * 2)
    ctx.arc(cx, cy - s * 0.4, s * 0.55, 0, Math.PI * 2)
    ctx.globalAlpha = 0.85
    ctx.fill()
  } else if (icon === 'terminal') {
    ctx.strokeRect(cx - s, cy - s * 0.75, s * 2, s * 1.5)
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.55, cy - s * 0.1)
    ctx.lineTo(cx - s * 0.1, cy + s * 0.2)
    ctx.lineTo(cx - s * 0.55, cy + s * 0.5)
    ctx.moveTo(cx + s * 0.05, cy + s * 0.5)
    ctx.lineTo(cx + s * 0.7, cy + s * 0.5)
    ctx.stroke()
  } else if (icon === 'monitor') {
    ctx.strokeRect(cx - s, cy - s * 0.7, s * 2, s * 1.3)
    ctx.beginPath()
    ctx.moveTo(cx - s * 0.4, cy + s * 0.75)
    ctx.lineTo(cx + s * 0.4, cy + s * 0.75)
    ctx.moveTo(cx, cy + s * 0.6)
    ctx.lineTo(cx, cy + s * 0.75)
    ctx.stroke()
  } else {
    // globe
    ctx.beginPath()
    ctx.arc(cx, cy, s, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx, cy, s * 0.4, s, 0, 0, Math.PI * 2)
    ctx.moveTo(cx - s, cy)
    ctx.lineTo(cx + s, cy)
    ctx.stroke()
  }
  ctx.restore()
}

/** Luminous glass ring + icon — matches concept art (NOT solid filled circles). */
function paintNode(
  ctx: CanvasRenderingContext2D,
  node: any,
  globalScale: number,
  selected: boolean,
  dimmed: boolean,
) {
  const kind = node.kind || 'host'
  const color = KIND_COLOR[kind] || '#3ec7e8'
  const icon =
    node.meta?.icon ||
    (kind === 'service' ? 'globe' : kind === 'host' ? 'server' : kind === 'cert' ? 'lock' : 'lock')
  const isHub = String(node.label || '') === 'api-gateway-01'
  const r = isHub ? 18 : selected ? 14 : 11
  const x = Number(node.x)
  const y = Number(node.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  const alpha = dimmed ? 0.28 : 1

  ctx.save()
  ctx.globalAlpha = alpha

  // Soft outer bloom (no opaque disc)
  const bloom = ctx.createRadialGradient(x, y, Math.max(0.01, r * 0.15), x, y, Math.max(1, r * 2.6))
  bloom.addColorStop(0, hexA(color, selected || isHub ? 0.5 : 0.32))
  bloom.addColorStop(0.45, hexA(color, selected || isHub ? 0.18 : 0.1))
  bloom.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = bloom
  ctx.beginPath()
  ctx.arc(x, y, r * 2.6, 0, Math.PI * 2)
  ctx.fill()

  // Glass core — mostly transparent with cool highlight (hollow look)
  const glass = ctx.createRadialGradient(
    x - r * 0.25,
    y - r * 0.35,
    Math.max(0.01, r * 0.05),
    x,
    y,
    Math.max(1, r),
  )
  glass.addColorStop(0, 'rgba(230,248,255,0.34)')
  glass.addColorStop(0.35, 'rgba(40,90,140,0.18)')
  glass.addColorStop(0.75, 'rgba(8,20,40,0.22)')
  glass.addColorStop(1, 'rgba(4,10,22,0.08)')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = glass
  ctx.fill()

  // Neon outer ring
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = hexA(color, selected || isHub ? 1 : 0.92)
  ctx.lineWidth = selected || isHub ? 2.6 : 1.7
  ctx.shadowColor = color
  ctx.shadowBlur = selected || isHub ? 16 : 9
  ctx.stroke()
  ctx.shadowBlur = 0

  // Inner hairline ring (glass rim)
  ctx.beginPath()
  ctx.arc(x, y, r * 0.7, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Specular crescent
  ctx.beginPath()
  ctx.arc(x, y, r * 0.88, -Math.PI * 0.85, -Math.PI * 0.2)
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  drawIcon(ctx, String(icon), x, y, '#eef8ff', r / 11)

  // Labels: name above, IP below (concept layout)
  if (globalScale > 0.45 || isHub || selected) {
    const fontPx = Math.max(10 / globalScale, 3)
    const ipPx = Math.max(8.5 / globalScale, 2.6)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.font = `600 ${fontPx}px "IBM Plex Sans", sans-serif`
    ctx.fillStyle = dimmed ? '#5a738f' : '#eaf3ff'
    ctx.fillText(String(node.label || ''), x, y - r - 5)

    if (node.meta?.ip && (globalScale > 0.7 || isHub || selected)) {
      ctx.textBaseline = 'top'
      ctx.font = `500 ${ipPx}px "IBM Plex Mono", monospace`
      ctx.fillStyle = dimmed ? '#3d5268' : '#7f9ab8'
      ctx.fillText(String(node.meta.ip), x, y + r + 4)
    }
  }

  ctx.restore()
}

const Galaxy = forwardRef<GalaxyHandle, Props>(function Galaxy(
  { nodes, edges, highlightIds, selectedId, onSelect },
  ref,
) {
  const fgRef = useRef<any>(null)
  const highlight = useMemo(() => new Set(highlightIds), [highlightIds])
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })

  const data = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: edges.map((e) => ({
        ...e,
        source: e.source,
        target: e.target,
      })),
    }),
    [nodes, edges],
  )

  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const z = fgRef.current?.zoom?.() ?? 1
      fgRef.current?.zoom?.(z * 1.25, 300)
    },
    zoomOut: () => {
      const z = fgRef.current?.zoom?.() ?? 1
      fgRef.current?.zoom?.(z / 1.25, 300)
    },
    recenter: () => fgRef.current?.zoomToFit?.(600, 60),
  }))

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth || 800, h: el.clientHeight || 600 })
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const g = fgRef.current
    if (!g) return
    // Pull hub toward center; keep constellation dense like the mock
    g.d3Force?.('charge')?.strength?.(-85)
    g.d3Force?.('link')?.distance?.(38)
    const fit = () => g.zoomToFit?.(500, 55)
    const t1 = setTimeout(fit, 250)
    const t2 = setTimeout(fit, 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [data, size.w, size.h])

  return (
    <div ref={wrapRef} className="galaxy-canvas-host">
      <ForceGraph2D
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        nodeId="id"
        nodeLabel={() => ''}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const dimmed = highlight.size > 0 && !highlight.has(node.id)
          const selected = selectedId === node.id
          paintNode(ctx, node, globalScale, selected, dimmed)
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return
          ctx.beginPath()
          ctx.arc(node.x, node.y, 16, 0, Math.PI * 2)
          ctx.fillStyle = color
          ctx.fill()
        }}
        linkColor={(l: any) =>
          l.kind === 'established' ? 'rgba(126,240,255,0.42)' : 'rgba(70,180,210,0.26)'
        }
        linkWidth={(l: any) => (l.kind === 'established' ? 1.15 : 0.65)}
        linkDirectionalParticles={(l: any) =>
          l.kind === 'established' ? 2 : l.kind === 'route' ? 1 : 0
        }
        linkDirectionalParticleSpeed={0.0035}
        linkDirectionalParticleWidth={1.3}
        linkDirectionalParticleColor={() => '#8af0ff'}
        onNodeClick={(n: any) => onSelect(n as GraphNode)}
        onBackgroundClick={() => onSelect(null)}
        cooldownTicks={140}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        enableNodeDrag
      />
    </div>
  )
})

export default Galaxy
