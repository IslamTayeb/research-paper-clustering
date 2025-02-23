"use client"

import { useCallback, useState, useMemo, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import * as d3 from "d3"

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-muted animate-pulse" />,
})

interface Node {
  id: string
  name: string
  category: {
    department: string
    performance: string
    location: string
    experience: string
  }
  x?: number
  y?: number
}

interface Link {
  source: string
  target: string
}

interface GraphData {
  nodes: Node[]
  links: Link[]
}

type ClusterCategory = "department" | "performance" | "location" | "experience"

const generateSampleData = (): GraphData => {
  const nodes: Node[] = []
  const links: Link[] = []

  const departments = ["Engineering", "Marketing", "Sales", "HR", "Finance", "Product", "Design"]
  const performances = ["Exceptional", "Above Average", "Average", "Below Average"]
  const locations = ["North America", "Europe", "Asia", "South America", "Africa", "Australia"]
  const experiences = ["Junior", "Mid-level", "Senior", "Lead", "Executive"]

  for (let i = 0; i < 200; i++) {
    const node: Node = {
      id: `node${i}`,
      name: `Node ${i}`,
      category: {
        department: departments[Math.floor(Math.random() * departments.length)],
        performance: performances[Math.floor(Math.random() * performances.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        experience: experiences[Math.floor(Math.random() * experiences.length)],
      },
    }
    nodes.push(node)
  }

  // Create links between nodes in the same category
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].category.department === nodes[j].category.department) {
        links.push({ source: nodes[i].id, target: nodes[j].id })
      }
    }
  }

  return { nodes, links }
}

const colorScale = d3.scaleOrdinal(d3.schemeCategory10)

export default function GraphVisualization() {
  const [clusterBy, setClusterBy] = useState<ClusterCategory>("department")
  const [graphData, setGraphData] = useState<GraphData>(generateSampleData)
  const graphRef = useRef<any>(null)
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null)

  const updateLinks = useCallback(
    (category: ClusterCategory) => {
      const newLinks: Link[] = []
      for (let i = 0; i < graphData.nodes.length; i++) {
        for (let j = i + 1; j < graphData.nodes.length; j++) {
          if (graphData.nodes[i].category[category] === graphData.nodes[j].category[category]) {
            newLinks.push({ source: graphData.nodes[i].id, target: graphData.nodes[j].id })
          }
        }
      }
      setGraphData((prevData) => ({ ...prevData, links: newLinks }))
    },
    [graphData.nodes],
  )

  useEffect(() => {
    updateLinks(clusterBy)
  }, [clusterBy, updateLinks])

  const getNodeColor = useCallback(
    (node: Node) => {
      return colorScale(node.category[clusterBy])
    },
    [clusterBy],
  )

  const handleNodeHover = useCallback((node: Node | null) => {
    setHoveredNode(node)
  }, [])

  const clusterStats = useMemo(() => {
    const stats = new Map<string, number>()
    graphData.nodes.forEach((node) => {
      const category = node.category[clusterBy]
      stats.set(category, (stats.get(category) || 0) + 1)
    })
    return Array.from(stats.entries()).map(([name, value]) => ({
      name,
      value,
      color: colorScale(name),
    }))
  }, [graphData.nodes, clusterBy])

  return (
    <Card className="p-4 relative">
      <div className="mb-4 flex justify-between items-center">
        <Select value={clusterBy} onValueChange={(value: ClusterCategory) => setClusterBy(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select cluster type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="experience">Experience Level</SelectItem>
          </SelectContent>
        </Select>
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={clusterStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={40}
                innerRadius={20}
              >
                {clusterStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="w-full h-[600px] border rounded-lg overflow-hidden relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeColor={getNodeColor}
          nodeLabel={(node: Node) => `${node.name}\n${clusterBy}: ${node.category[clusterBy]}`}
          linkColor={() => "rgba(200, 200, 200, 0.5)"}
          linkWidth={0.5}
          backgroundColor="#ffffff"
          width={800}
          height={600}
          nodeRelSize={7.5}
          onNodeHover={handleNodeHover}
          d3AlphaDecay={0.0223}
          d3VelocityDecay={0.4}
          cooldownTicks={100}
          onEngineStop={() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(400, 100)
            }
          }}
        />
        {hoveredNode && (
          <div className="absolute top-2 left-2 bg-background/80 p-2 rounded shadow">
            Node: {hoveredNode.name}
            <br />
            {clusterBy}: {hoveredNode.category[clusterBy]}
          </div>
        )}
      </div>
    </Card>
  )
}

