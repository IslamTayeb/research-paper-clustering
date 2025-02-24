"use client"

import * as React from "react"
import { Plus, Search, RefreshCw } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import ForceGraph2D from "react-force-graph-2d"
import { scaleOrdinal } from "d3-scale"
import { schemeCategory10 } from "d3-scale-chromatic"
import * as d3 from "d3"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const generateColorPalette = (numColors: number) => {
  const colorScale = scaleOrdinal(schemeCategory10)
  return Array.from({ length: numColors }, (_, i) => colorScale(i.toString()))
}

const NUM_CLUSTERS = 5
const NODES_PER_CLUSTER = 10

const generateClusteredGraphData = () => {
  const nodes = []
  const links = []
  const colorPalette = generateColorPalette(NUM_CLUSTERS)

  for (let cluster = 0; cluster < NUM_CLUSTERS; cluster++) {
    const clusterColor = colorPalette[cluster]
    // Add cluster center node
    const centerNodeId = `cluster-${cluster}`
    nodes.push({
      id: centerNodeId,
      cluster: cluster,
      color: clusterColor,
      val: NODES_PER_CLUSTER, // Size based on number of connected nodes
    })

    for (let i = 0; i < NODES_PER_CLUSTER; i++) {
      const nodeId = `${cluster}-${i}`
      nodes.push({
        id: nodeId,
        cluster: cluster,
        color: clusterColor,
        val: 1,
      })

      // Link to cluster center
      links.push({
        source: nodeId,
        target: centerNodeId,
      })
    }
  }

  return { nodes, links }
}

const initialGraphData = generateClusteredGraphData()

const calculateClusterPercentages = (nodes: any[]) => {
  const clusterCounts = nodes.reduce((acc, node) => {
    if (!node.id.startsWith("cluster-")) {
      acc[node.cluster] = (acc[node.cluster] || 0) + 1
    }
    return acc
  }, {})

  const total = (Object.values(clusterCounts) as number[]).reduce((sum, count) => sum + count, 0)
  return Object.entries(clusterCounts).map(([cluster, count]) => ({
    name: `Cluster ${cluster}`,
    value: ((count as number) / total) * 100,
  }))
}

export default function ClusterView() {
  const [clusters, setClusters] = React.useState<string[]>([])
  const [newCluster, setNewCluster] = React.useState("")
  const [graphDataState, setGraphDataState] = React.useState(initialGraphData)
  const [pieData, setPieData] = React.useState(calculateClusterPercentages(initialGraphData.nodes))
  const forceGraphRef = React.useRef()
  const [query, setQuery] = React.useState("")
  const [manualCluster, setManualCluster] = React.useState("")
  const [manualExplanation, setManualExplanation] = React.useState("")
  const [refineCategory, setRefineCategory] = React.useState("")

  const handleAddCluster = () => {
    if (newCluster.trim() !== "") {
      setClusters([...clusters, newCluster.trim()])
      setNewCluster("")
    }
  }

  const handleNodeRightClick = React.useCallback((node) => {
    setGraphDataState(({ nodes, links }) => {
      let newNodes, newLinks
      if (node.id.startsWith("cluster-")) {
        // If it's a parent node, remove it and all its children
        const clusterToRemove = node.cluster
        newNodes = nodes.filter((n) => n.cluster !== clusterToRemove)
        newLinks = links.filter((l) => l.source.cluster !== clusterToRemove && l.target.cluster !== clusterToRemove)
      } else {
        // If it's a child node, remove it and update the parent node's size
        newNodes = nodes.filter((n) => n.id !== node.id)
        const parentNode = newNodes.find((n) => n.id === `cluster-${node.cluster}`)
        if (parentNode) {
          parentNode.val = Math.max(1, parentNode.val - 1)
          // If the parent node has no more children, remove it
          if (parentNode.val === 1) {
            newNodes = newNodes.filter((n) => n.id !== parentNode.id)
          }
        }
        newLinks = links.filter((l) => l.source.id !== node.id && l.target.id !== node.id)
      }
      const newPieData = calculateClusterPercentages(newNodes)
      setPieData(newPieData)
      return { nodes: newNodes, links: newLinks }
    })
  }, [])

  const refreshGraph = React.useCallback(() => {
    const newGraphData = generateClusteredGraphData()
    setGraphDataState(newGraphData)
    setPieData(calculateClusterPercentages(newGraphData.nodes))

    const fg = forceGraphRef.current
    if (fg) {
      // @ts-ignore
      fg.d3ReheatSimulation()
    }
  }, [])

  const drawGridPattern = React.useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = "rgba(200, 200, 200, 0.1)"
    ctx.lineWidth = 1

    // Draw vertical lines
    for (let x = 0; x <= width; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // Draw horizontal lines
    for (let y = 0; y <= height; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }, [])

  React.useEffect(() => {
    const fg = forceGraphRef.current
    if (fg) {
      // @ts-ignore
      fg.d3Force("charge").strength(-10)
      // @ts-ignore
      fg.d3Force("link").distance(30)
      // Add central gravity
      // @ts-ignore
      fg.d3Force("center", d3.forceCenter())
      // @ts-ignore
      fg.d3Force(
        "collide",
        d3.forceCollide((node) => Math.sqrt(node.val) * 2),
      )
    }
  }, [])

  const handleQuerySubmit = () => {
    console.log("Query submitted:", query)
    // Implement clustering logic based on the query
  }

  const handleManualClusterSubmit = () => {
    console.log("Manual cluster:", manualCluster)
    console.log("Explanation:", manualExplanation)
    // Implement manual clustering logic
  }

  const handleRefineCategorySubmit = () => {
    console.log("Refine category:", refineCategory)
    // Implement category refinement logic
  }

  return (
    <Card className="w-full h-[calc(100vh-2rem)] m-4 overflow-hidden">
      <CardContent className="p-4 h-full relative">
        <Card className="absolute left-4 top-4 w-64 z-10 h-[calc(100%-2rem)] overflow-y-auto">
          <CardHeader>
            <CardTitle>Cluster Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="query" className="">Cluster Query</Label>
              <Input
                id="query"
                placeholder="Enter clustering query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button className="w-full mt-2" onClick={handleQuerySubmit}>
                <Search className="mr-2 h-4 w-4" /> Submit Query
              </Button>
            </div>
            <div className="flex flex-col">
              <Label htmlFor="manual-cluster">Manual Cluster</Label>

              <Input
                id="manual-cluster"
                placeholder="Enter cluster name"
                value={manualCluster}
                onChange={(e) => setManualCluster(e.target.value)}
              />
              <Textarea
                placeholder="Explanation for the cluster"
                value={manualExplanation}
                onChange={(e) => setManualExplanation(e.target.value)}
                className="mt-2"
              />
              <Button className="w-full mt-2" onClick={handleManualClusterSubmit}>
                <Plus className="mr-2 h-4 w-4" /> Add Manual Cluster
              </Button>
            </div>
            <div>
              <Label htmlFor="refine-category">Refine Category</Label>
              <Input
                id="refine-category"
                placeholder="Enter refinement query"
                value={refineCategory}
                onChange={(e) => setRefineCategory(e.target.value)}
              />
              <Button className="w-full mt-2" onClick={handleRefineCategorySubmit}>
                <RefreshCw className="mr-2 h-4 w-4" /> Refine Category
              </Button>
            </div>
            <Button className="w-full" onClick={refreshGraph}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Graph
            </Button>
          </CardContent>
        </Card>
        <div className="w-full h-full">
          <ForceGraph2D
            ref={forceGraphRef}
            graphData={graphDataState}
            nodeRelSize={6}
            nodeVal={(node) => node.val}
            linkColor={() => "rgba(200, 200, 200, 0.5)"}
            nodeColor={(node: any) => node.color}
            onNodeRightClick={handleNodeRightClick}
            cooldownTicks={5000}
            onEngineStop={() => {
              // @ts-ignore
              forceGraphRef.current.d3Force("center", null)
            }}
            onRenderFramePre={(ctx, canvas) => {
              drawGridPattern(ctx, canvas.width, canvas.height)
            }}
          />
        </div>
        <div className="absolute bottom-4 right-4 w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      graphDataState.nodes.find((node) => node.cluster === Number.parseInt(entry.name.split(" ")[1]))
                        ?.color
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
