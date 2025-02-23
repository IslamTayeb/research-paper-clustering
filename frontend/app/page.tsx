import GraphVisualization from "./graph-visualization"

export default function Page() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Interactive Cluster Visualization</h1>
      <GraphVisualization />
    </div>
  )
}

