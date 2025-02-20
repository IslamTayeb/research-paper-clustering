import streamlit as st
import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.manifold import TSNE
import plotly.express as px
import pandas as pd

def load_data():
    with open("research_data.json") as f:
        return json.load(f)

def get_embeddings(texts, model):
    return model.encode(texts)

def main():
    st.title("Research Paper Clustering")

    data = load_data()
    papers = data["papers"]

    # Load BERT model
    @st.cache_resource
    def load_bert_model():
        return SentenceTransformer('all-MiniLM-L6-v2')

    model = load_bert_model()

    # Clustering options
    n_clusters = st.slider("Number of clusters", 2, 10, 5)
    embedding_source = st.selectbox(
        "Embedding source",
        ["abstract", "title", "abstract + title"]
    )

    # Prepare texts for embedding
    texts = []
    for paper in papers:
        if embedding_source == "abstract":
            texts.append(paper["abstract"])
        elif embedding_source == "title":
            texts.append(paper["title"])
        else:
            texts.append(paper["title"] + " " + paper["abstract"])

    # Get embeddings and cluster
    embeddings = get_embeddings(texts, model)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    clusters = kmeans.fit_predict(embeddings)

    # Dimensionality reduction for visualization
    tsne = TSNE(n_components=2, random_state=42)
    reduced_embeddings = tsne.fit_transform(embeddings)

    # Create DataFrame for plotting
    plot_df = pd.DataFrame({
        'x': reduced_embeddings[:, 0],
        'y': reduced_embeddings[:, 1],
        'cluster': clusters,
        'title': [p["title"] for p in papers],
        'year': [p["year"] for p in papers],
        'journal': [p["journal"] for p in papers]
    })

    # Plot
    fig = px.scatter(
        plot_df,
        x='x',
        y='y',
        color='cluster',
        hover_data=['title', 'year', 'journal'],
        title='Paper Clusters'
    )
    st.plotly_chart(fig)

    # Display papers by cluster
    st.subheader("Papers by Cluster")
    selected_cluster = st.selectbox("Select cluster", range(n_clusters))

    cluster_papers = [p for i, p in enumerate(papers) if clusters[i] == selected_cluster]
    for paper in cluster_papers:
        st.write(f"**{paper['title']}** ({paper['year']})")
        st.write(f"*{paper['journal']}*")
        with st.expander("Abstract"):
            st.write(paper["abstract"])

if __name__ == "__main__":
    main()
