import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import pandas as pd
import xml.etree.ElementTree as ET
from google.colab import userdata


class ResearchDataCollector:
    def __init__(self):
        self.papers = []

    def fetch_pubmed_papers(
        self, query='selinexor "multiple myeloma"', max_retries=3, retry_delay=1
    ):
        import time

        base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"

        # First get IDs
        search_url = (
            f"{base_url}/esearch.fcgi?db=pubmed&term={query}&retmax=500&format=json"
        )
        response = requests.get(search_url)
        ids = response.json()["esearchresult"]["idlist"]

        # Then fetch details
        chunks = [ids[i : i + 50] for i in range(0, len(ids), 50)]
        for chunk in chunks:
            for attempt in range(max_retries):
                try:
                    fetch_url = f"{base_url}/efetch.fcgi?db=pubmed&id={','.join(chunk)}&retmode=xml"
                    response = requests.get(fetch_url)
                    root = ET.fromstring(response.content)

                    for article in root.findall(".//PubmedArticle"):
                        # Get abstract and skip if not found after retries
                        abstract = article.find(".//Abstract/AbstractText")
                        if abstract is None or not abstract.text:
                            continue

                        # Extract basic information
                        title = article.find(".//ArticleTitle")
                        title = title.text if title is not None else ""

                        # Enhanced date extraction
                        pub_date = article.find(".//PubDate")
                        year = pub_date.find("Year")
                        month = pub_date.find("Month")
                        day = pub_date.find("Day")

                        year = year.text if year is not None else ""
                        month = month.text if month is not None else ""
                        day = day.text if day is not None else ""

                        # Extract additional metadata
                        journal = article.find(".//Journal/Title")
                        journal = journal.text if journal is not None else ""

                        authors = []
                        author_list = article.findall(".//Author")
                        for author in author_list:
                            lastname = author.find("LastName")
                            firstname = author.find("ForeName")
                            if lastname is not None and firstname is not None:
                                authors.append(f"{lastname.text}, {firstname.text}")

                        # Get keywords
                        keywords = []
                        keyword_list = article.findall(".//Keyword")
                        for keyword in keyword_list:
                            if keyword is not None and keyword.text:
                                keywords.append(keyword.text)

                        # Get DOI
                        doi = article.find(".//ArticleId[@IdType='doi']")
                        doi = doi.text if doi is not None else ""

                        self.papers.append(
                            {
                                "type": "research_paper",
                                "title": title,
                                "abstract": abstract.text,
                                "year": year,
                                "month": month,
                                "day": day,
                                "journal": journal,
                                "authors": authors,
                                "keywords": keywords,
                                "doi": doi,
                                "pubmed_id": article.find(".//PMID").text
                                if article.find(".//PMID") is not None
                                else "",
                                "source": "pubmed",
                            }
                        )
                    break  # Success, break the retry loop

                except Exception as e:
                    if attempt == max_retries - 1:  # Last attempt
                        print(
                            f"Error processing chunk after {max_retries} attempts: {e}"
                        )
                    else:
                        print(f"Attempt {attempt + 1} failed: {e}. Retrying...")
                        time.sleep(retry_delay)

    def collect_all_data(self):
        print("Fetching PubMed papers...")
        self.fetch_pubmed_papers()

        all_data = {
            "papers": self.papers,
            "metadata": {
                "collection_date": datetime.now().isoformat(),
                "query_terms": ["selinexor", "endometrial cancer"],
            },
        }

        return all_data


if __name__ == "__main__":
    collector = ResearchDataCollector()
    data = collector.collect_all_data()
    with open('research_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
