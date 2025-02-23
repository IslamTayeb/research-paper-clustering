import streamlit as st
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN, AgglomerativeClustering
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
import plotly.express as px
import pandas as pd
from collections import Counter


def load_data():
    with open("research_data.json") as f:
        return json.load(f)


def get_embeddings(texts, model):
    # Normalize embeddings
    embeddings = model.encode(texts)
    scaler = StandardScaler()
    return scaler.fit_transform(embeddings)


def get_optimal_clusters(embeddings, min_cluster_size=3):
    # Try DBSCAN with different eps values
    eps_values = np.arange(0.3, 1.0, 0.1)
    best_n_clusters = 0
    best_labels = None

    for eps in eps_values:
        clustering = DBSCAN(eps=eps, min_samples=min_cluster_size)
        labels = clustering.fit_predict(embeddings)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)

        if n_clusters > best_n_clusters:
            best_n_clusters = n_clusters
            best_labels = labels

    if best_n_clusters < 2:
        # Fallback to hierarchical clustering
        clustering = AgglomerativeClustering(n_clusters=5)
        best_labels = clustering.fit_predict(embeddings)

    return best_labels


def main():
    st.title("Research Paper Clustering")

    data = load_data()
    papers = data["papers"]

    @st.cache_resource
    def load_biobert_model():
        return SentenceTransformer("dmis-lab/biobert-base-cased-v1.1")

    model = load_biobert_model()

    # Combine title, abstract and journal for better context
    texts = []
    for paper in papers:
        title = paper.get("title", "") or ""
        abstract = paper.get("abstract", "") or ""
        journal = paper.get("journal", "") or ""
        combined_text = f"{title} {abstract} {journal}"
        texts.append(combined_text)

    # Get embeddings and cluster
    embeddings = get_embeddings(texts, model)
    clusters = get_optimal_clusters(embeddings)

    # Dimensionality reduction with perplexity tuning
    tsne = TSNE(n_components=2, perplexity=min(30, len(texts) - 1))
    reduced_embeddings = tsne.fit_transform(embeddings)

    # Create enhanced DataFrame
    plot_df = pd.DataFrame(
        {
            "x": reduced_embeddings[:, 0],
            "y": reduced_embeddings[:, 1],
            "cluster": clusters,
            "title": [p["title"] for p in papers],
            "year": [p.get("year", "") for p in papers],
            "journal": [p.get("journal", "") for p in papers],
            "authors": [", ".join(p.get("authors", []))[:100] for p in papers],
        }
    )

    # Enhanced visualization
    fig = px.scatter(
        plot_df,
        x="x",
        y="y",
        color="cluster",
        hover_data=["title", "year", "journal", "authors"],
        title="Paper Clusters",
        labels={"cluster": "Research Topic Group"},
    )
    fig.update_traces(marker=dict(size=10))
    st.plotly_chart(fig)

    # Cluster analysis
    cluster_counts = Counter(clusters)
    valid_clusters = [c for c in sorted(cluster_counts.keys()) if c != -1]

    st.subheader("Research Topics by Cluster")
    selected_cluster = st.selectbox(
        "Select cluster",
        valid_clusters,
        format_func=lambda x: f"Topic Group {x} ({cluster_counts[x]} papers)",
    )

    cluster_papers = [
        p for i, p in enumerate(papers) if clusters[i] == selected_cluster
    ]
    for paper in cluster_papers:
        st.write(f"**{paper['title']}** ({paper.get('year', 'N/A')})")
        st.write(f"*{paper.get('journal', 'N/A')}*")
        if paper.get("authors"):
            st.write(f"Authors: {', '.join(paper['authors'][:3])}")
        with st.expander("Abstract"):
            st.write(paper.get("abstract", "No abstract available"))


if __name__ == "__main__":
    main()
