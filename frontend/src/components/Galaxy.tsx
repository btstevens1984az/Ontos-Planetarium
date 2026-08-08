import { useEffect, useMemo, useRef } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import type { GraphEdge, GraphNode } from '../api'

type Props = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  highlightIds: string[]
  selectedId: string | null
  onSelect: (node: GraphNode | null) => void
}

const KIND_COLOR: Record<string, string> = {
  host: '#f0c36a',
  process: '#3de0ff',
  endpoint: '#7ef0c3',
  service: '#9b8cff',
  cert: '#ff9f6b',
}

export default function Galaxy({ nodes, edges, highlightIds, selectedId, onSelect }: Props) {
  const fgRef = useRef<any>(null)
  const highlight = useMemo(() => new Set(highlightIds), [highlightIds])

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

  useEffect(() => {
    const fit = () => fgRef.current?.zoomToFit?.(600, 40)
    const t1 = setTimeout(fit, 250)
    const t2 = setTimeout(fit, 900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [data])

  return (
    <ForceGraph3D
      ref={fgRef}
      graphData={data}
      backgroundColor="rgba(0,0,0,0)"
      nodeId="id"
      nodeLabel={(n: any) => `${n.label} (${n.kind})`}
      nodeVal={(n: any) => (n.kind === 'host' ? 8 : n.kind === 'service' ? 5 : 3)}
      nodeOpacity={0.95}
      nodeColor={(n: any) => {
        if (selectedId && n.id === selectedId) return '#ffffff'
        if (highlight.size && !highlight.has(n.id)) return '#1b2a44'
        return KIND_COLOR[n.kind] || '#3de0ff'
      }}
      linkColor={() => 'rgba(61,224,255,0.35)'}
      linkWidth={(l: any) => (l.kind === 'established' ? 1.4 : 0.7)}
      linkOpacity={0.7}
      linkDirectionalParticles={(l: any) => (l.kind === 'established' ? 2 : 0)}
      linkDirectionalParticleSpeed={0.006}
      linkDirectionalParticleWidth={1.2}
      onNodeClick={(n: any) => onSelect(n as GraphNode)}
      onBackgroundClick={() => onSelect(null)}
      showNavInfo={false}
    />
  )
}
