import { useState, useEffect, useRef, useCallback } from 'react';

interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  readingTime: number;
}

interface Props {
  initialArticles: Article[];
  allArticles: Article[];
  batchSize?: number;
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

export default function InfiniteScroll({
  initialArticles,
  allArticles,
  batchSize = 10,
}: Props) {
  const [displayedArticles, setDisplayedArticles] = useState(initialArticles);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const hasMore = displayedArticles.length < allArticles.length;

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    // Use requestAnimationFrame for smooth loading
    requestAnimationFrame(() => {
      const currentLength = displayedArticles.length;
      const nextBatch = allArticles.slice(
        currentLength,
        currentLength + batchSize
      );

      setDisplayedArticles((prev) => [...prev, ...nextBatch]);
      setIsLoading(false);
    });
  }, [allArticles, batchSize, displayedArticles.length, hasMore, isLoading]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, loadMore]);

  return (
    <div>
      <div className="divide-y divide-gray-200">
        {displayedArticles.map((article) => (
          <ArticleCardClient key={article.slug} article={article} />
        ))}
      </div>

      <div ref={observerTarget} className="py-8">
        {isLoading && <LoadingSpinner />}
        {!hasMore && displayedArticles.length > 0 && (
          <p className="text-center text-gray-500 text-sm">
            You have reached the end. All {allArticles.length} articles loaded.
          </p>
        )}
      </div>
    </div>
  );
}
