import { useState, useEffect, useCallback, useRef } from 'react';

interface SearchResult {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
  relevance: number;
  matchedKeywords: string[];
}

interface SearchResponse {
  query?: string;
  tags?: string[];
  availableTags?: string[];
  count: number;
  results: SearchResult[];
}

interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readingTime: number;
}

interface Props {
  allArticles: Article[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ArticleCardClient({ article }: { article: Article }) {
  return (
    <article className="py-6 border-b border-gray-200 last:border-b-0">
      <a
        href={`/articles/${article.slug}`}
        className="group block cursor-pointer"
      >
        <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
          {article.title}
        </h2>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 mb-2">
          <time dateTime={article.date}>{formatDate(article.date)}</time>
          <span className="text-gray-300">|</span>
          <span>{article.readingTime} min read</span>
        </div>

        <p className="text-gray-600 line-clamp-2 mb-3">{article.description}</p>

        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </a>
    </article>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <svg
        className="animate-spin h-6 w-6 text-primary-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export default function ArticleSearch({ allArticles }: Props) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const debounceTimerRef = useRef<number | null>(null);

  const performSearch = useCallback(async (searchQuery: string, tags: string[]) => {
    // If no query and no tags, show all articles
    if (!searchQuery.trim() && tags.length === 0) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }

    setIsSearching(true);
    setIsSearchActive(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('q', searchQuery);
      }
      if (tags.length > 0) {
        params.set('tags', tags.join(','));
      }

      const response = await fetch(`/api/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data: SearchResponse = await response.json();

      // Store available tags from the response
      if (data.availableTags && data.availableTags.length > 0) {
        setAvailableTags(data.availableTags);
      }

      // Map search results to articles with reading time
      const resultsWithReadingTime = data.results.map((result) => {
        // Find the original article to get reading time
        const originalArticle = allArticles.find(
          (a) => a.slug === result.slug
        );

        return {
          slug: result.slug,
          title: result.title,
          description: result.description,
          date: result.date,
          tags: result.tags,
          readingTime: originalArticle?.readingTime || 1,
        };
      });

      setSearchResults(resultsWithReadingTime);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search articles. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [allArticles]);

  // Load available tags on mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        // Make a dummy search to get available tags
        const response = await fetch('/api/search?q=');
        if (response.ok) {
          const data: SearchResponse = await response.json();
          if (data.availableTags) {
            setAvailableTags(data.availableTags);
          }
        }
      } catch (err) {
        console.error('Failed to load tags:', err);
      }
    };
    loadTags();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      performSearch(query, selectedTags);
    }, 300);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, selectedTags, performSearch]);

  const handleClearSearch = () => {
    setQuery('');
    setSelectedTags([]);
    setSearchResults([]);
    setIsSearchActive(false);
    setError(null);
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const displayedArticles = isSearchActive ? searchResults : allArticles;

  return (
    <div>
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles by keywords or tags..."
            className="w-full px-4 py-3 pl-12 pr-10 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
            aria-label="Search articles"
          />

          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Clear Button */}
          {(query || selectedTags.length > 0) && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Horizontal Tag Filter */}
        {availableTags.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Filter by tags
            </div>
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-2 pb-2">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`
                        flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full transition-colors
                        ${isSelected
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                      aria-label={`${isSelected ? 'Remove' : 'Add'} ${tag} filter`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Search Status */}
        {isSearchActive && (
          <div className="mt-3 text-sm text-gray-600">
            {isSearching ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner />
                <span>Searching...</span>
              </span>
            ) : error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <span>
                Found {searchResults.length} article
                {searchResults.length !== 1 ? 's' : ''}
                {query && ` matching "${query}"`}
                {selectedTags.length > 0 && (
                  <> with tag{selectedTags.length !== 1 ? 's' : ''}: {selectedTags.join(', ')}</>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Articles List */}
      <div className="divide-y divide-gray-200">
        {displayedArticles.length > 0 ? (
          displayedArticles.map((article) => (
            <ArticleCardClient key={article.slug} article={article} />
          ))
        ) : (
          isSearchActive && !isSearching && (
            <div className="py-12 text-center">
              <p className="text-gray-500 text-lg">No articles found matching your search.</p>
              <p className="text-gray-400 text-sm mt-2">
                Try different keywords or{' '}
                <button
                  onClick={handleClearSearch}
                  className="text-primary-600 hover:underline"
                >
                  clear your search
                </button>
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
