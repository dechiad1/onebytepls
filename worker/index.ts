/**
 * Cloudflare Worker: onebytepls
 *
 * Routes:
 * - /api/search - Article search API
 * - /* - Static assets from dist/
 */

// Configuration
const ANALYTICS_SAMPLE_RATE = 100; // Percentage of searches to log (0-100)

interface Env {
  ENVIRONMENT?: string;
  SEARCH_INDEX_BUCKET: R2Bucket;
  ASSETS: Fetcher; // Static assets binding
  ANALYTICS?: AnalyticsEngineDataset; // Analytics Engine binding
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
  keywords: string[]; // Sorted list of all keywords for binary search
  tagIndex: Record<string, string[]>; // tag -> article slugs
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
  tags?: string[]; 
  availableTags?: string[]; 
  count?: number;
  results: SearchResult[];
  error?: string;
  message?: string;
}

/**
 * Find the range of keywords that start with the given prefix using binary search
 */
function findPrefixRange(keywords: string[], prefix: string): [number, number] {
  const n = keywords.length;

  // Find first keyword with prefix (lower bound)
  let left = 0;
  let right = n;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (keywords[mid] < prefix) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  const start = left;

  // Find first keyword after prefix range (upper bound)
  // We look for the first keyword >= prefix + "~" (character after 'z')
  const prefixEnd = prefix.slice(0, -1) + String.fromCharCode(prefix.charCodeAt(prefix.length - 1) + 1);
  left = start;
  right = n;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (keywords[mid] < prefixEnd) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  const end = left;

  return [start, end];
}


/**
 * Search articles by query string and tags
 */
function searchArticles(
  searchIndex: SearchIndex,
  query: string,
  selectedTags: string[] = [],
  timing?: { tagFilter: number; textSearch: number; postFilter: number }
): SearchResult[] {
  // Map to store articles with their relevance scores
  const resultsMap = new Map<string, SearchResult>();

  // If we have tag filters, use tag index for efficient lookup
  const tagStart = performance.now();
  if (selectedTags.length > 0) {
    const selectedTagsLower = selectedTags.map(t => t.toLowerCase());

    // Get slugs for first tag
    const firstTag = selectedTagsLower[0];
    const firstTagSlugs = searchIndex.tagIndex[firstTag] || [];

    // Find intersection: slugs that have ALL selected tags
    const matchingSlugs = firstTagSlugs.filter(slug => {
      // Check if this slug appears in all other tags
      return selectedTagsLower.slice(1).every(tag => {
        const tagSlugs = searchIndex.tagIndex[tag] || [];
        return tagSlugs.includes(slug);
      });
    });

    // Add matching articles to results
    for (const slug of matchingSlugs) {
      const article = searchIndex.articles[slug];
      if (article) {
        resultsMap.set(slug, {
          slug,
          ...article,
          relevance: selectedTags.length, 
          matchedKeywords: [],
        });
      }
    }
  }
  if (timing) timing.tagFilter = performance.now() - tagStart;

  // If there's a text query, search through keywords
  const textStart = performance.now();
  if (query && query.trim().length > 0) {
    const queryTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0);

    // For each query term, search keywords using binary search
    for (const queryTerm of queryTerms) {
      // Use binary search to find keywords with matching prefix
      const [start, end] = findPrefixRange(searchIndex.keywords, queryTerm);

      // Process all keywords in the prefix range
      for (let i = start; i < end; i++) {
        const keyword = searchIndex.keywords[i];

        // Verify it actually starts with the query term
        if (!keyword.startsWith(queryTerm)) {
          continue;
        }
        const slugs = searchIndex.index[keyword] || [];

        for (const slug of slugs) {
          const existing = resultsMap.get(slug);

          if (existing) {
            // Article already in results (matched tags), boost relevance
            existing.relevance += 1;
            if (!existing.matchedKeywords.includes(keyword)) {
              existing.matchedKeywords.push(keyword);
            }
          } else {
            // Article not in results yet
            // If we have tag filters, skip articles that didn't match tags
            if (selectedTags.length > 0) {
              continue;
            }

            // No tag filters, add article based on keyword match
            const article = searchIndex.articles[slug];
            if (article) {
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
  if (timing) timing.textSearch = performance.now() - textStart;

  // If both tags and text query are provided, filter out articles that don't match the text
  const postFilterStart = performance.now();
  let results = Array.from(resultsMap.values());

  if (selectedTags.length > 0 && query && query.trim().length > 0) {
    // Only keep articles that have matched keywords (text search found matches)
    results = results.filter(article => article.matchedKeywords.length > 0);
  }

  // Sort by relevance (descending)
  results.sort((a, b) => b.relevance - a.relevance);

  if (timing) timing.postFilter = performance.now() - postFilterStart;

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
 * Write search metrics to Analytics Engine
 *
 * @param env - Environment with ANALYTICS binding
 * @param data - Search metrics data
 * @param sampleRate - Percentage of requests to log (0-100), default 100
 */
function writeSearchMetrics(
  env: Env,
  data: {
    query: string;
    tags: string[];
    timing: {
      indexFetch: number;
      total: number;
    };
    resultCount: number;
  },
  sampleRate: number = 100
): void {
  // Check if Analytics Engine is available
  if (!env.ANALYTICS) {
    return;
  }

  // Sampling: only log sampleRate% of requests
  if (sampleRate < 100 && Math.random() * 100 > sampleRate) {
    return;
  }

  // Categorize result count: 0 = no results, 1 = 1-5, 2 = 6-10, 3 = 11+
  let resultCategory = '0';
  if (data.resultCount > 0) resultCategory = '1';
  if (data.resultCount > 5) resultCategory = '2';
  if (data.resultCount > 10) resultCategory = '3';

  env.ANALYTICS.writeDataPoint({
    blobs: [
      data.query || '',
      data.tags.join(',')
    ],
    doubles: [
      data.timing.indexFetch,
      data.timing.total,
    ],
    indexes: [
      resultCategory,
    ],
  });
}

/**
 * Handle search API requests
 */
async function handleSearch(request: Request, env: Env): Promise<Response> {
  const timingStart = performance.now();
  const timing = {
    indexFetch: 0,
    tagFilter: 0,
    textSearch: 0,
    postFilter: 0,
    total: 0,
  };

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
    const fetchStart = performance.now();
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
    timing.indexFetch = performance.now() - fetchStart;

    // Perform search with timing
    const searchStart = performance.now();
    const results = searchArticles(searchIndex, query, selectedTags, timing);
    timing.total = performance.now() - timingStart;

    console.log('Search timing:', {
      query,
      tags: selectedTags,
      timing,
      resultCount: results.length,
    });

    // Write metrics to Analytics Engine
    writeSearchMetrics(env, {
      query,
      tags: selectedTags,
      timing,
      resultCount: results.length,
    }, ANALYTICS_SAMPLE_RATE);

    // Return results
    return jsonResponse({
      query: query || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      availableTags: searchIndex.tags,
      count: results.length,
      results
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
