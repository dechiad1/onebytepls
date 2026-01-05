#!/usr/bin/env python3
"""
Build search index for article search functionality.

This script:
1. Reads all articles from src/content/articles/
2. Extracts frontmatter (title, description, tags, date)
3. Performs frequency analysis on article content
4. Generates a search index JSON file in public/
"""

import json
import re
from pathlib import Path
from collections import Counter
from typing import List, Dict, Any
import yaml

# Configuration
ARTICLES_DIR = Path("src/content/articles")
OUTPUT_FILE = Path("public/search-index.json")
MIN_WORD_LENGTH = 4
TOP_KEYWORDS_COUNT = 15
STOPWORDS = {
    "this", "that", "with", "from", "have", "will", "your", "they",
    "been", "were", "their", "there", "these", "those", "would",
    "could", "should", "about", "which", "where", "when", "what",
    "them", "then", "than", "into", "through", "during", "before",
    "after", "above", "below", "between", "under", "again", "further",
    "once", "here", "more", "most", "other", "some", "such", "only",
    "same", "also", "very", "just", "each", "being", "doing", "make",
    "made", "uses", "used", "using", "example", "code", "like", "well"
}


def parse_frontmatter(content: str) -> tuple[Dict[str, Any], str]:
    """
    Parse YAML frontmatter from markdown content.

    Returns:
        Tuple of (frontmatter dict, body content)
    """
    # Match frontmatter between --- delimiters
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)

    if not match:
        return {}, content

    frontmatter_str, body = match.groups()
    frontmatter = yaml.safe_load(frontmatter_str)

    return frontmatter, body


def extract_words(text: str) -> List[str]:
    """
    Extract words from text, removing code blocks, special chars, etc.
    """
    # Remove code blocks
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    text = re.sub(r'`[^`]+`', '', text)

    # Remove URLs
    text = re.sub(r'https?://\S+', '', text)

    # Remove markdown syntax
    text = re.sub(r'[#*_\[\](){}]', ' ', text)

    # Extract words (alphanumeric)
    words = re.findall(r'\b[a-z]+\b', text.lower())

    # Filter by length and stopwords
    words = [
        w for w in words
        if len(w) >= MIN_WORD_LENGTH and w not in STOPWORDS
    ]

    return words


def get_top_keywords(words: List[str], count: int = TOP_KEYWORDS_COUNT) -> List[str]:
    """
    Get top N most frequent keywords from word list.
    """
    word_counts = Counter(words)
    return [word for word, _ in word_counts.most_common(count)]


def build_search_index() -> Dict[str, Any]:
    """
    Build the search index from all articles.

    Returns:
        Dictionary mapping keywords to article metadata
    """
    index: Dict[str, List[Dict[str, Any]]] = {}
    articles: List[Dict[str, Any]] = []

    # Find all article index.md files
    article_files = list(ARTICLES_DIR.glob("*/index.md"))

    print(f"Found {len(article_files)} articles")

    for article_file in article_files:
        article_slug = article_file.parent.name

        # Read article content
        content = article_file.read_text(encoding='utf-8')

        # Parse frontmatter and body
        frontmatter, body = parse_frontmatter(content)

        # Extract metadata
        title = frontmatter.get('title', '')
        description = frontmatter.get('description', '')
        tags = frontmatter.get('tags', [])
        date = str(frontmatter.get('date', ''))

        # Extract words from content
        words = extract_words(body)

        # Get top keywords from content
        content_keywords = get_top_keywords(words)

        # Combine tags and content keywords (tags have priority)
        all_keywords = list(tags) + content_keywords

        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for keyword in all_keywords:
            keyword_lower = keyword.lower()
            if keyword_lower not in seen:
                seen.add(keyword_lower)
                unique_keywords.append(keyword_lower)

        # Create article metadata
        article_metadata = {
            "slug": article_slug,
            "title": title,
            "description": description,
            "tags": tags,
            "date": date,
            "keywords": unique_keywords
        }

        articles.append(article_metadata)

        # Build keyword index
        for keyword in unique_keywords:
            if keyword not in index:
                index[keyword] = []

            # Add article reference (without keywords to avoid duplication)
            article_ref = {
                "slug": article_slug,
                "title": title,
                "description": description,
                "tags": tags,
                "date": date
            }
            index[keyword].append(article_ref)

        print(f"  ✓ {article_slug}: {len(unique_keywords)} keywords")

    return {
        "index": index,
        "articles": articles,
        "metadata": {
            "total_articles": len(articles),
            "total_keywords": len(index),
            "generated_at": "BUILD_TIME"
        }
    }


def main():
    """Main entry point."""
    print("Building search index...")
    print(f"Reading articles from: {ARTICLES_DIR}")

    # Build index
    search_data = build_search_index()

    # Ensure output directory exists
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Write to file
    OUTPUT_FILE.write_text(
        json.dumps(search_data, indent=2, ensure_ascii=False),
        encoding='utf-8'
    )

    print(f"\n✓ Search index generated: {OUTPUT_FILE}")
    print(f"  - {search_data['metadata']['total_articles']} articles")
    print(f"  - {search_data['metadata']['total_keywords']} unique keywords")


if __name__ == "__main__":
    main()
