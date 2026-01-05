/**
 * Cloudflare Pages Function: /api/search
 *
 * Handles article search requests by loading the pre-built search index
 * and performing partial string matching on keywords.
 */

interface SearchIndexArticle {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
}

interface SearchIndex {
  index: Record<string, SearchIndexArticle[]>;
  articles: Array<SearchIndexArticle & { keywords: string[] }>;
  metadata: {
    total_articles: number;
    total_keywords: number;
    generated_at: string;
  };
}

interface SearchResult extends SearchIndexArticle {
  relevance: number;
  matchedKeywords: string[];
}

/**
 * Performs partial string matching on keywords
 */
function partialMatch(query: string, keyword: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // Exact match
  if (lowerKeyword === lowerQuery) return true;

  // Partial match (keyword contains query)
  if (lowerKeyword.includes(lowerQuery)) return true;

  // Query contains keyword (for shorter keywords)
  if (lowerQuery.includes(lowerKeyword)) return true;

  return false;
}

/**
 * Search articles by query string
 */
function searchArticles(
  searchIndex: SearchIndex,
  query: string
): SearchResult[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  // Map to store articles with their relevance scores
  const resultsMap = new Map<string, SearchResult>();

  // Search through the keyword index
  for (const [keyword, articles] of Object.entries(searchIndex.index)) {
    for (const queryTerm of queryTerms) {
      if (partialMatch(queryTerm, keyword)) {
        // Add or update articles that match this keyword
        for (const article of articles) {
          const existing = resultsMap.get(article.slug);

          if (existing) {
            // Increase relevance and add matched keyword
            existing.relevance += 1;
            if (!existing.matchedKeywords.includes(keyword)) {
              existing.matchedKeywords.push(keyword);
            }
          } else {
            // Create new result entry
            resultsMap.set(article.slug, {
              ...article,
              relevance: 1,
              matchedKeywords: [keyword],
            });
          }
        }
      }
    }
  }

  // Convert to array and sort by relevance (descending)
  const results = Array.from(resultsMap.values()).sort(
    (a, b) => b.relevance - a.relevance
  );

  return results;
}

/**
 * Cloudflare Pages Function handler
 */
export async function onRequestGet(context: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> {
  try {
    // Parse query parameter
    const url = new URL(context.request.url);
    const query = url.searchParams.get("q") || url.searchParams.get("query");

    if (!query) {
      return new Response(
        JSON.stringify({
          error: "Missing query parameter. Use ?q=your-search-term",
          results: [],
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Fetch the search index
    // In Cloudflare Pages, we can fetch from the same origin
    const indexUrl = new URL("/search-index.json", url.origin);
    const indexResponse = await fetch(indexUrl.toString());

    if (!indexResponse.ok) {
      throw new Error(`Failed to load search index: ${indexResponse.status}`);
    }

    const searchIndex: SearchIndex = await indexResponse.json();

    // Perform search
    const results = searchArticles(searchIndex, query);

    // Return results
    return new Response(
      JSON.stringify({
        query,
        count: results.length,
        results,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    console.error("Search error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        results: [],
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
