/**
 * Cloudflare Worker: onebytepls
 *
 * Routes:
 * - /api/search - Article search API
 * - /* - Static assets from dist/
 */

interface Env {
  ENVIRONMENT?: string;
  SEARCH_INDEX_BUCKET: R2Bucket;
  ASSETS: Fetcher; // Static assets binding
}

// Search-specific types
interface SearchIndexArticle {
  title: string;
  description: string;
  tags: string[];
  date: string;
}

interface SearchIndex {
  index: Record<string, string[]>; // keyword -> article slugs
  articles: Record<string, SearchIndexArticle>; // slug -> article metadata
  tags: string[]; // All unique tags
  metadata: {
    total_articles: number;
    total_keywords: number;
    total_tags: number;
    generated_at: string;
  };
}

interface SearchResult extends SearchIndexArticle {
  slug: string;
  relevance: number;
  matchedKeywords: string[];
}

interface SearchResponse {
  query?: string;
  tags?: string[]; // Selected tag filters
  availableTags?: string[]; // All available tags
  count?: number;
  results: SearchResult[];
  error?: string;
  message?: string;
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
 * Search articles by query string and tags
 */
function searchArticles(
  searchIndex: SearchIndex,
  query: string,
  selectedTags: string[] = []
): SearchResult[] {
  // Map to store articles with their relevance scores
  const resultsMap = new Map<string, SearchResult>();

  // If we have tag filters, start by filtering articles with matching tags
  if (selectedTags.length > 0) {
    const selectedTagsLower = selectedTags.map(t => t.toLowerCase());

    for (const [slug, article] of Object.entries(searchIndex.articles)) {
      // Check if article has ALL selected tags (AND logic)
      const articleTagsLower = article.tags.map(t => t.toLowerCase());
      const hasAllTags = selectedTagsLower.every(tag =>
        articleTagsLower.includes(tag)
      );

      if (hasAllTags) {
        resultsMap.set(slug, {
          slug,
          ...article,
          relevance: selectedTags.length, // Base relevance from tag matches
          matchedKeywords: [],
        });
      }
    }
  }

  // If there's a text query, search through keywords
  if (query && query.trim().length > 0) {
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0);

    // Search through the keyword index
    for (const [keyword, slugs] of Object.entries(searchIndex.index)) {
      for (const queryTerm of queryTerms) {
        if (partialMatch(queryTerm, keyword)) {
          // Add or update articles that match this keyword
          for (const slug of slugs) {
            const existing = resultsMap.get(slug);

            if (existing) {
              // Increase relevance and add matched keyword
              existing.relevance += 1;
              if (!existing.matchedKeywords.includes(keyword)) {
                existing.matchedKeywords.push(keyword);
              }
            } else {
              // If we have tag filters, only include articles that passed the tag filter
              if (selectedTags.length > 0) {
                continue; // Skip articles that don't match tag filters
              }

              // Look up article metadata
              const article = searchIndex.articles[slug];
              if (article) {
                // Create new result entry
                resultsMap.set(slug, {
                  slug,
                  ...article,
                  relevance: 1,
                  matchedKeywords: [keyword],
                });
              }
            }
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
 * Create JSON response with CORS headers
 */
function jsonResponse(data: SearchResponse, status: number = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...(status === 200 && { "Cache-Control": "public, max-age=300" }),
    },
  });
}

/**
 * Handle search API requests
 */
async function handleSearch(request: Request, env: Env): Promise<Response> {
  try {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only allow GET requests
    if (request.method !== "GET") {
      return jsonResponse(
        {
          error: "Method not allowed",
          results: [],
        },
        405
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";
    const tagsParam = url.searchParams.get("tags");
    const selectedTags = tagsParam ? tagsParam.split(",").filter(t => t.length > 0) : [];

    // Fetch the search index
    const isLocal = env.ENVIRONMENT === 'development';
    let searchIndex: SearchIndex;

    if (isLocal) {
      // Local dev: fetch from Astro dev server (serves from public/)
      const indexUrl = 'http://localhost:4321/search-index.json';
      const response = await fetch(indexUrl);
      if (!response.ok) {
        throw new Error(`Failed to load search index from Astro: ${response.status}`);
      }
      searchIndex = await response.json();
    } else {
      // Production: read from R2 bucket
      const indexObject = await env.SEARCH_INDEX_BUCKET.get('search-index.json');
      if (!indexObject) {
        throw new Error('Search index not found in R2 bucket');
      }

      searchIndex = await indexObject.json();
    }

    // Perform search
    const results = searchArticles(searchIndex, query, selectedTags);

    // Return results
    return jsonResponse({
      query: query || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      availableTags: searchIndex.tags,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Search error:", error);

    return jsonResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        results: [],
      },
      500
    );
  }
}

/**
 * Main Worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route: /api/search
    if (url.pathname === '/api/search') {
      return handleSearch(request, env);
    }

    // Route: All other requests -> serve static assets
    return env.ASSETS.fetch(request);
  },
};
