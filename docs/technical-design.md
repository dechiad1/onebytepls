# Technical Design Document: Personal Website for Technical Writing

**Document Version**: 1.0
**Date**: December 30, 2025
**Author**: Engineering Team

---

## 1. Executive Summary

This document outlines the technical architecture and implementation approach for a personal website designed to showcase technical articles. The design prioritizes simplicity, performance, maintainability, and alignment with the product specification requirements.

### Key Technical Decisions

| Decision Area | Recommendation |
|--------------|----------------|
| Static Site Generator | **Astro** |
| Styling Framework | **Tailwind CSS** |
| Syntax Highlighting | **Shiki** (built into Astro) |
| Image Optimization | **Astro Image** (built-in) |
| Infinite Scroll | **Client-side JavaScript with JSON index** |
| Deployment Target | **Cloudflare R2 + Cloudflare Pages** |

---

## 2. Static Site Generator Evaluation

### Candidates Evaluated

| Generator | Markdown Support | Image Co-location | Build Performance | Customization | GitHub Actions | Final Score |
|-----------|-----------------|-------------------|-------------------|---------------|----------------|-------------|
| **Astro** | Excellent | Native | Excellent | Excellent | Excellent | **9.5/10** |
| Hugo | Excellent | Good | Excellent | Good | Excellent | 8.5/10 |
| Eleventy | Excellent | Good | Good | Excellent | Excellent | 8/10 |
| Next.js SSG | Good | Manual | Good | Excellent | Excellent | 7.5/10 |

### Recommendation: Astro

**Astro** is recommended as the static site generator for this project based on the following analysis:

#### Strengths

1. **Content-First Architecture**: Astro is designed specifically for content-driven websites, making it ideal for a technical blog.

2. **Native Markdown with Co-located Images**: Astro's content collections feature supports markdown files with frontmatter and automatically handles images in the same directory - directly matching requirement FR-1.3.

3. **Zero JavaScript by Default**: Astro ships zero JavaScript to the client unless explicitly needed, ensuring excellent Lighthouse scores (NFR-1.5) and fast page loads (NFR-1.1, NFR-1.2).

4. **Built-in Image Optimization**: Astro includes `@astrojs/image` integration that handles compression, format conversion (WebP, AVIF), and responsive image generation during build time (FR-4.2, FR-4.4).

5. **Built-in Syntax Highlighting**: Astro uses Shiki for syntax highlighting out of the box, supporting all common programming languages (FR-3.1, FR-3.2).

6. **Excellent Build Performance**: Astro's build times are among the fastest, easily meeting the < 60 seconds for 100 articles requirement (NFR-1.4).

7. **Tailwind CSS Integration**: First-class Tailwind CSS support via official integration, enabling the Tailwind-like configuration system requested (FR-5.1).

8. **TypeScript Support**: Built-in TypeScript support for type-safe configuration and components.

9. **Island Architecture**: When JavaScript is needed (infinite scroll), Astro's island architecture allows selective hydration without bloating the entire site.

#### Why Not Hugo?

Hugo was a close second due to its exceptional build speed. However:
- Go templating syntax has a steeper learning curve
- Image optimization requires additional tooling or manual setup
- Less flexibility for JavaScript interactivity when needed
- Theming system is more rigid than Astro's component-based approach

#### Why Not Eleventy?

Eleventy is excellent but:
- Requires more manual configuration for image optimization
- Less opinionated, which increases setup time
- JavaScript configuration can become complex for advanced use cases

#### Why Not Next.js SSG?

Next.js is powerful but:
- Ships more JavaScript than necessary for a content-focused site
- Image optimization is designed for server-side rendering, less optimal for pure static
- Overkill for this use case - adds complexity without benefit

---

## 3. High-Level Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │   Content    │    │    Astro     │    │      Static Output       │  │
│  │  (Markdown)  │───▶│    Build     │───▶│    (HTML/CSS/JS/IMG)     │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
│         │                   │                         │                  │
│         │                   │                         │                  │
│  ┌──────▼──────┐    ┌──────▼──────┐                  │                  │
│  │ Frontmatter │    │   Tailwind  │                  │                  │
│  │  Metadata   │    │     CSS     │                  │                  │
│  └─────────────┘    └─────────────┘                  │                  │
│                                                       │                  │
└───────────────────────────────────────────────────────│──────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           CI/CD PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │    GitHub    │    │   GitHub     │    │     Cloudflare R2        │  │
│  │  Repository  │───▶│   Actions    │───▶│   (Static Hosting)       │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
│         │                   │                         │                  │
│    Push/Merge         Build & Test              Upload Assets           │
│                                                       │                  │
│                                                       ▼                  │
│                                              ┌──────────────────┐        │
│                                              │   Cloudflare     │        │
│                                              │   CDN + SSL      │        │
│                                              │  onebytepls.com  │        │
│                                              └──────────────────┘        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           RUNTIME ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        CLOUDFLARE CDN                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │  HTML Pages │  │ CSS/JS      │  │ Optimized Images        │  │    │
│  │  │  (Cached)   │  │ (Cached)    │  │ (WebP/AVIF, Cached)     │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                         USER BROWSER                             │    │
│  │                                                                   │    │
│  │  • Static HTML (immediate render)                                │    │
│  │  • Minimal CSS (Tailwind, purged)                                │    │
│  │  • Optional JS (infinite scroll island)                          │    │
│  │  • Optimized images (lazy loaded)                                │    │
│  │                                                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PAGE COMPONENTS                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐   │
│  │     HomePage      │  │   ArticlesPage    │  │    AboutPage      │   │
│  │                   │  │                   │  │                   │   │
│  │  • CoverPhoto     │  │  • ArticleList    │  │  • AuthorBio      │   │
│  │  • RecentArticles │  │  • InfiniteScroll │  │  • MiniResume     │   │
│  │  • Navigation     │  │  • Navigation     │  │  • SocialLinks    │   │
│  │                   │  │                   │  │  • Navigation     │   │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ArticleDetailPage                             │    │
│  │                                                                   │    │
│  │  • ArticleHeader (title, date, reading time, tags)               │    │
│  │  • ArticleContent (rendered markdown with images & code)         │    │
│  │  • Navigation                                                     │    │
│  │                                                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                        SHARED COMPONENTS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Navigation  │  │ ArticleCard │  │   Footer    │  │  BaseHead   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                      │
│  │  SocialIcon │  │ ReadingTime │  │  TagList    │                      │
│  └─────────────┘  └─────────────┘  └─────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Project Structure

```
onebytepls/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions deployment workflow
│
├── src/
│   ├── content/
│   │   ├── articles/               # Markdown articles with co-located images
│   │   │   ├── my-first-article/
│   │   │   │   ├── index.md        # Article markdown with frontmatter
│   │   │   │   ├── diagram.png     # Co-located images
│   │   │   │   └── screenshot.png
│   │   │   └── another-article/
│   │   │       ├── index.md
│   │   │       └── cover.png
│   │   └── config.ts               # Content collection schema definition
│   │
│   ├── pages/
│   │   ├── index.astro             # Home page
│   │   ├── articles/
│   │   │   ├── index.astro         # Articles listing page
│   │   │   └── [...slug].astro     # Dynamic article detail pages
│   │   └── about.astro             # About page
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro        # Base HTML layout with head, nav, footer
│   │   └── ArticleLayout.astro     # Layout for individual articles
│   │
│   ├── components/
│   │   ├── Navigation.astro        # Site navigation
│   │   ├── Footer.astro            # Site footer
│   │   ├── ArticleCard.astro       # Article preview card
│   │   ├── ArticleList.astro       # List of article cards
│   │   ├── CoverPhoto.astro        # Home page cover image
│   │   ├── RecentArticles.astro    # 5 most recent articles section
│   │   ├── ReadingTime.astro       # Reading time display
│   │   ├── TagList.astro           # Tags display
│   │   ├── SocialLinks.astro       # LinkedIn/GitHub links
│   │   └── InfiniteScroll.tsx      # React component for infinite scroll
│   │
│   ├── styles/
│   │   └── global.css              # Global styles and Tailwind imports
│   │
│   └── utils/
│       ├── articles.ts             # Article fetching and sorting utilities
│       └── readingTime.ts          # Reading time calculation
│
├── public/
│   ├── images/
│   │   └── cover.jpg               # Home page cover photo
│   ├── favicon.ico
│   └── robots.txt
│
├── config/
│   ├── site.ts                     # Site-wide configuration
│   └── theme.ts                    # Theme/styling configuration tokens
│
├── astro.config.mjs                # Astro configuration
├── tailwind.config.mjs             # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json
└── README.md
```

### Directory Rationale

| Directory | Purpose |
|-----------|---------|
| `src/content/articles/` | Co-located markdown and images per article, leveraging Astro Content Collections |
| `src/pages/` | File-based routing - each file becomes a route |
| `src/layouts/` | Reusable page structure templates |
| `src/components/` | Reusable UI components |
| `config/` | Centralized configuration for theming and site settings |
| `public/` | Static assets served as-is (favicon, robots.txt, cover photo) |

---

## 5. Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Astro | ^4.x | Static site generation |
| TypeScript | ^5.x | Type safety |
| Tailwind CSS | ^3.x | Utility-first styling |
| Shiki | (built-in) | Syntax highlighting |
| Sharp | (via Astro) | Image optimization |

### Development Dependencies

| Package | Purpose |
|---------|---------|
| `@astrojs/tailwind` | Tailwind CSS integration |
| `@astrojs/react` | React integration for interactive components |
| `@astrojs/sitemap` | Automatic sitemap generation |
| `prettier` | Code formatting |
| `prettier-plugin-astro` | Astro file formatting |
| `eslint` | Code linting |

### Runtime Dependencies (Client-side)

| Package | Purpose | Size Impact |
|---------|---------|-------------|
| None required | Zero JS by default | 0 KB |
| React (optional) | Infinite scroll island | ~40 KB (gzipped) |

**Note**: React is only loaded on the Articles page for infinite scroll functionality. All other pages ship zero JavaScript.

---

## 6. Feature Implementation

### 6.1 Markdown with Co-located Images (FR-1.1, FR-1.3)

**Implementation**: Astro Content Collections

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.date(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    cover_image: image().optional(),
  }),
});

export const collections = { articles };
```

**Article Example**:
```markdown
---
title: "Building Scalable React Applications"
date: 2025-01-15
description: "A deep dive into architecture patterns for large React apps"
tags:
  - react
  - architecture
cover_image: ./cover.png
---

# Introduction

Here's a diagram of the architecture:

![Architecture Diagram](./architecture.png)

The key components are...
```

**Key Benefits**:
- Images in the same folder as markdown are automatically resolved
- Type-safe frontmatter validation
- Build-time error checking for missing images or invalid metadata

### 6.2 Syntax Highlighting (FR-3.1, FR-3.2)

**Implementation**: Shiki (built into Astro)

```javascript
// astro.config.mjs
export default defineConfig({
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      langs: ['javascript', 'typescript', 'python', 'go', 'rust', 'bash', 'json', 'yaml', 'html', 'css'],
      wrap: true,
    },
  },
});
```

**Theme Recommendation**: `github-dark` or `one-dark-pro` for readability. The theme can be configured in `astro.config.mjs` without code changes.

**Supported Languages**: Shiki supports 100+ languages out of the box. Unknown languages fall back to plain text formatting gracefully (addressing edge case in spec).

### 6.3 Image Optimization (FR-4.1, FR-4.2, FR-4.4)

**Implementation**: Astro's built-in image optimization

```astro
---
// In an Astro component
import { Image } from 'astro:assets';
import diagram from '../content/articles/my-article/diagram.png';
---

<Image
  src={diagram}
  alt="Architecture diagram"
  widths={[400, 800, 1200]}
  formats={['webp', 'avif']}
  loading="lazy"
/>
```

**Build-time Processing**:
- Converts PNG/JPG to WebP and AVIF formats
- Generates multiple sizes for responsive images
- Adds width/height attributes to prevent layout shift
- Lazy loading by default

**Output Example**:
```html
<picture>
  <source type="image/avif" srcset="/_image/diagram-400.avif 400w, /_image/diagram-800.avif 800w">
  <source type="image/webp" srcset="/_image/diagram-400.webp 400w, /_image/diagram-800.webp 800w">
  <img src="/_image/diagram-800.png" alt="Architecture diagram" width="800" height="600" loading="lazy">
</picture>
```

### 6.4 Infinite Scroll (US-08, FR-2.2)

**Implementation Strategy**: Client-side JavaScript with pre-built JSON index

This is the most complex feature for a static site. The recommended approach:

1. **Build Time**: Generate a JSON file containing all article metadata
2. **Initial Render**: Display first batch of articles (10-15) in static HTML
3. **Client-side**: Load additional articles via fetch when user scrolls near bottom

```typescript
// src/utils/generateArticlesIndex.ts
// Called during build to create /articles.json

export async function generateArticlesIndex(articles: Article[]) {
  return articles.map(article => ({
    slug: article.slug,
    title: article.data.title,
    date: article.data.date.toISOString(),
    description: article.data.description,
    tags: article.data.tags || [],
  }));
}
```

```tsx
// src/components/InfiniteScroll.tsx
import { useState, useEffect, useRef } from 'react';

interface Article {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
}

interface Props {
  initialArticles: Article[];
  allArticles: Article[];
  batchSize?: number;
}

export default function InfiniteScroll({
  initialArticles,
  allArticles,
  batchSize = 10
}: Props) {
  const [displayedArticles, setDisplayedArticles] = useState(initialArticles);
  const [hasMore, setHasMore] = useState(initialArticles.length < allArticles.length);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, displayedArticles.length]);

  const loadMore = () => {
    setIsLoading(true);

    // Simulate network delay for smooth UX
    setTimeout(() => {
      const currentLength = displayedArticles.length;
      const nextBatch = allArticles.slice(currentLength, currentLength + batchSize);

      setDisplayedArticles(prev => [...prev, ...nextBatch]);
      setHasMore(currentLength + nextBatch.length < allArticles.length);
      setIsLoading(false);
    }, 100);
  };

  return (
    <div>
      <div className="space-y-6">
        {displayedArticles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>

      <div ref={observerTarget} className="h-10 flex items-center justify-center">
        {isLoading && <LoadingSpinner />}
        {!hasMore && <span className="text-gray-500">All articles loaded</span>}
      </div>
    </div>
  );
}
```

**Articles Page Integration**:
```astro
---
// src/pages/articles/index.astro
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import InfiniteScroll from '../../components/InfiniteScroll';

const articles = await getCollection('articles');
const sortedArticles = articles
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
  .map(article => ({
    slug: article.slug,
    title: article.data.title,
    date: article.data.date.toISOString(),
    description: article.data.description,
    tags: article.data.tags || [],
  }));

const initialBatch = sortedArticles.slice(0, 10);
---

<BaseLayout title="Articles">
  <main class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-8">Articles</h1>

    <!-- Initial articles rendered as static HTML for SEO -->
    <noscript>
      <div class="space-y-6">
        {sortedArticles.map((article) => (
          <article class="border-b pb-6">
            <a href={`/articles/${article.slug}`}>
              <h2 class="text-xl font-semibold">{article.title}</h2>
            </a>
            <p class="text-gray-600 mt-2">{article.description}</p>
          </article>
        ))}
      </div>
    </noscript>

    <!-- Interactive infinite scroll for JS-enabled browsers -->
    <InfiniteScroll
      client:load
      initialArticles={initialBatch}
      allArticles={sortedArticles}
    />
  </main>
</BaseLayout>
```

**Progressive Enhancement**:
- Without JavaScript, all articles are visible (noscript fallback)
- With JavaScript, users get the infinite scroll experience
- Meets NFR-5.3 (functions without JavaScript for core content)

### 6.5 Theming and Customization (FR-5.1, FR-5.2, US-02)

**Implementation**: Tailwind CSS with custom configuration

```typescript
// config/theme.ts
export const theme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
    },
    accent: '#f97316',
    background: '#ffffff',
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
    },
  },
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  spacing: {
    article: {
      maxWidth: '65ch',
      lineHeight: '1.75',
    },
  },
};
```

```javascript
// tailwind.config.mjs
import { theme as siteTheme } from './config/theme';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: siteTheme.colors,
      fontFamily: siteTheme.fonts,
      typography: {
        DEFAULT: {
          css: {
            maxWidth: siteTheme.spacing.article.maxWidth,
            lineHeight: siteTheme.spacing.article.lineHeight,
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
```

**Site Configuration**:
```typescript
// config/site.ts
export const site = {
  title: 'One Byte Please',
  description: 'Technical articles and insights',
  author: {
    name: 'Author Name',
    bio: 'Software engineer passionate about...',
    avatar: '/images/avatar.jpg',
  },
  social: {
    linkedin: 'https://linkedin.com/in/username',
    github: 'https://github.com/username',
  },
  navigation: [
    { label: 'Articles', href: '/articles' },
    { label: 'About', href: '/about' },
  ],
};
```

**Customization Workflow**:
1. Edit `config/theme.ts` for colors, fonts, spacing
2. Edit `config/site.ts` for metadata, navigation, social links
3. Rebuild site - changes apply globally
4. No component code changes required for basic customization

### 6.6 Reading Time Calculation (FR-1.6)

```typescript
// src/utils/readingTime.ts
const WORDS_PER_MINUTE = 200;

export function calculateReadingTime(content: string): number {
  const text = content.replace(/<[^>]*>/g, ''); // Strip HTML
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / WORDS_PER_MINUTE);
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}
```

### 6.7 YouTube Video Embeds (FR-4.3)

**Implementation**: Custom Astro component with markdown shortcode

```astro
---
// src/components/YouTubeEmbed.astro
interface Props {
  id: string;
  title?: string;
}

const { id, title = 'YouTube video' } = Astro.props;
---

<div class="aspect-video my-8">
  <iframe
    src={`https://www.youtube-nocookie.com/embed/${id}`}
    title={title}
    loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
    class="w-full h-full rounded-lg"
  ></iframe>
</div>
```

**Usage in Markdown** (via MDX):
```mdx
import YouTubeEmbed from '../../components/YouTubeEmbed.astro';

Here's a great video explanation:

<YouTubeEmbed id="dQw4w9WgXcQ" title="Architecture Overview" />
```

---

## 7. Build and Deployment Pipeline

### 7.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare R2

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  NODE_VERSION: '20'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build

      - name: Upload to Cloudflare R2
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: r2 object put onebytepls --file=./dist --recursive

      - name: Purge Cloudflare cache
        run: |
          curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
            -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            --data '{"purge_everything":true}'
```

### 7.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. AUTHOR WORKFLOW                                                      │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  Write article → git add → git commit → git push             │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  2. CI/CD (GitHub Actions)                                              │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  Checkout → Install → Build → Test → Upload to R2            │    │
│     │                                                               │    │
│     │  Build steps:                                                 │    │
│     │  • Process markdown to HTML                                   │    │
│     │  • Optimize images (WebP, AVIF, responsive sizes)            │    │
│     │  • Apply Tailwind (purge unused CSS)                         │    │
│     │  • Generate sitemap                                          │    │
│     │  • Bundle any JavaScript (infinite scroll)                   │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  3. CLOUDFLARE R2 (Storage)                                             │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  Static files stored in R2 bucket                            │    │
│     │  • HTML pages                                                 │    │
│     │  • CSS/JS bundles                                            │    │
│     │  • Optimized images                                          │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│                                    ▼                                     │
│  4. CLOUDFLARE CDN (Delivery)                                           │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  • Global edge caching                                       │    │
│     │  • SSL/TLS termination                                       │    │
│     │  • Automatic HTTPS redirect                                  │    │
│     │  • onebytepls.com domain routing                            │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Local Development - Task

```json
// package.json scripts
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "lint": "eslint src/",
    "format": "prettier --write ."
  }
}
```

**Development Workflow**:
1. `npm run dev` - Start local dev server with hot reload
2. Create/edit content in `src/content/articles/`
3. View changes at `http://localhost:4321`
4. `npm run build` - Test production build locally
5. `npm run preview` - Preview production build
6. Commit and push to deploy

**tasks**
1. task dev: npm run dev
2. task create article "article-name": create a folder in src/content/articles
3. task build: npm run build
4. task preview: npm run preview

---

## 8. Responsive Design Implementation

### 8.1 Breakpoint Strategy

```css
/* Mobile-first breakpoints (Tailwind defaults) */
/* Mobile: default (< 640px) */
/* sm: 640px and up */
/* md: 768px and up */
/* lg: 1024px and up */
/* xl: 1280px and up */
```

### 8.2 Layout Approach

```astro
---
// Example: ArticleCard component with responsive design
---

<article class="
  flex flex-col
  md:flex-row md:items-start
  gap-4
  p-4
  border-b border-gray-200
">
  <!-- Cover image (if present) -->
  {coverImage && (
    <div class="
      w-full
      md:w-48 md:flex-shrink-0
      aspect-video md:aspect-square
      overflow-hidden rounded-lg
    ">
      <Image
        src={coverImage}
        alt=""
        class="w-full h-full object-cover"
      />
    </div>
  )}

  <div class="flex-1">
    <h2 class="
      text-lg
      sm:text-xl
      font-semibold
      text-gray-900
    ">
      <a href={`/articles/${slug}`} class="hover:text-primary-600">
        {title}
      </a>
    </h2>

    <div class="
      flex flex-wrap items-center gap-2
      mt-2
      text-sm text-gray-500
    ">
      <time datetime={date}>{formattedDate}</time>
      <span>·</span>
      <span>{readingTime} min read</span>
    </div>

    <p class="
      mt-2
      text-gray-600
      line-clamp-2
      sm:line-clamp-3
    ">
      {description}
    </p>
  </div>
</article>
```

### 8.3 Typography Scale

```javascript
// tailwind.config.mjs - Typography plugin configuration
typography: {
  DEFAULT: {
    css: {
      fontSize: '1rem',
      lineHeight: '1.75',
      maxWidth: '65ch',
      'h1': { fontSize: '2.25rem', fontWeight: '700' },
      'h2': { fontSize: '1.875rem', fontWeight: '600' },
      'h3': { fontSize: '1.5rem', fontWeight: '600' },
      'code': {
        fontSize: '0.875em',
        fontFamily: 'JetBrains Mono, monospace',
      },
    },
  },
  sm: {
    css: {
      fontSize: '0.875rem',
      'h1': { fontSize: '1.875rem' },
      'h2': { fontSize: '1.5rem' },
      'h3': { fontSize: '1.25rem' },
    },
  },
},
```

---

## 9. Performance Optimization

### 9.1 Build-time Optimizations

| Optimization | Implementation | Impact |
|--------------|---------------|--------|
| CSS Purging | Tailwind removes unused styles | ~95% CSS size reduction |
| Image Compression | Sharp via Astro | 50-80% image size reduction |
| Modern Formats | WebP/AVIF generation | Additional 25-35% savings |
| HTML Minification | Astro default | ~10% HTML size reduction |
| Zero JS Default | Astro architecture | No JS overhead on most pages |

### 9.2 Runtime Optimizations

| Optimization | Implementation |
|--------------|---------------|
| Lazy Loading | `loading="lazy"` on images |
| Preconnect | `<link rel="preconnect">` for fonts |
| Font Display | `font-display: swap` |
| Critical CSS | Tailwind inlines critical styles |
| CDN Caching | Cloudflare edge caching |

### 9.3 Expected Performance Metrics

| Metric | Target | Expected |
|--------|--------|----------|
| Lighthouse Performance | >= 90 | 95-100 |
| First Contentful Paint | < 1.5s | < 1.0s |
| Largest Contentful Paint | < 2.5s | < 1.5s |
| Total Page Weight (Home) | < 1 MB | < 300 KB |
| Time to Interactive | < 3s | < 1.5s |

---

## 10. Accessibility Implementation

### 10.1 Semantic HTML Structure

```astro
<!-- Base layout structure -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- SEO and accessibility meta tags -->
  </head>
  <body>
    <a href="#main-content" class="sr-only focus:not-sr-only">
      Skip to main content
    </a>

    <header role="banner">
      <nav aria-label="Main navigation">
        <!-- Navigation links -->
      </nav>
    </header>

    <main id="main-content" role="main">
      <slot />
    </main>

    <footer role="contentinfo">
      <!-- Footer content -->
    </footer>
  </body>
</html>
```

### 10.2 Accessibility Features

| Feature | Implementation |
|---------|---------------|
| Skip Link | Hidden link to jump to main content |
| Alt Text | Required in image components; sourced from markdown |
| ARIA Labels | Navigation, landmarks, interactive elements |
| Focus Indicators | Visible focus styles for keyboard navigation |
| Color Contrast | Minimum 4.5:1 ratio (AA compliance) |
| Reduced Motion | Respect `prefers-reduced-motion` |

### 10.3 Keyboard Navigation

```css
/* Focus styles in global.css */
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* Skip link */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.sr-only:focus-visible {
  position: static;
  width: auto;
  height: auto;
  padding: 1rem;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

---

## 11. Trade-offs and Alternatives

### 11.1 Static Site Generator

| Decision | Trade-off |
|----------|-----------|
| **Chose Astro over Hugo** | Slower build times (still fast), but better DX for JavaScript interactivity |
| **Chose Astro over Next.js** | Less ecosystem/plugins, but significantly smaller bundle size and simpler deployment |
| **Chose Astro over Eleventy** | More opinionated (less flexibility), but faster time-to-production |

### 11.2 Infinite Scroll Implementation

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Client-side JS (chosen)** | Simple, works with static hosting, good UX | Requires JS for full experience | Selected |
| Build-time pagination | No JS needed, SEO-friendly | Poor UX (page reloads), more complex routing | Rejected |
| Virtual scrolling | Handles thousands of items | Overkill for ~100 articles, complex | Rejected |

**Mitigation**: Progressive enhancement ensures content is accessible without JavaScript.

### 11.3 Styling Approach

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Tailwind CSS (chosen)** | Fast development, small bundle, easy theming | Learning curve, verbose HTML | Selected |
| CSS Modules | Scoped styles, familiar CSS | Harder theming, more boilerplate | Rejected |
| Styled Components | Component-scoped, dynamic styles | Runtime overhead, SSR complexity | Rejected |

### 11.4 Image Optimization

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Build-time (Astro)** | Zero runtime cost, guaranteed optimization | Slower builds, larger repo | Selected |
| Cloudflare Image Resizing | Dynamic, no build impact | Additional cost, dependency | Rejected |
| External service (Cloudinary) | Powerful features | External dependency, cost | Rejected |

### 11.5 Deployment Target

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **Cloudflare R2 + CDN** | Cheap, fast, integrated with domain | R2 upload complexity | Selected |
| Cloudflare Pages | Simpler deployment | Less control over caching | Alternative |
| AWS S3 + CloudFront | Battle-tested | More complex setup | Rejected |

**Note**: Cloudflare Pages could be used instead of R2 for simpler deployment. Both work with the same domain and CDN.

---

## 12. Security Considerations

### 12.1 Static Site Security Benefits

- No server-side code execution risk
- No database vulnerabilities
- No user input processing on server
- Content is pre-rendered and static

### 12.2 Security Measures

| Measure | Implementation |
|---------|---------------|
| HTTPS | Enforced via Cloudflare |
| Content Security Policy | Configured in Cloudflare headers |
| Subresource Integrity | For external scripts (if any) |
| No secrets in client code | All sensitive config in GitHub Secrets |

### 12.3 Cloudflare Security Headers

```
# _headers file for Cloudflare
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 13. Testing Strategy

### 13.1 Pre-deployment Checks

| Check | Tool | When |
|-------|------|------|
| Build Success | Astro CLI | Every commit |
| Type Checking | TypeScript | Every commit |
| Linting | ESLint | Every commit |
| Lighthouse Audit | CI integration | Every PR |

### 13.2 Manual Testing Checklist

- [ ] All pages render correctly
- [ ] Navigation works on all pages
- [ ] Images display correctly
- [ ] Code syntax highlighting works
- [ ] Infinite scroll loads articles
- [ ] Mobile viewport is correct
- [ ] No console errors
- [ ] Accessibility audit passes

---

## 14. Future Considerations

The following features are out of scope for initial release but the architecture supports their addition:

| Feature | Implementation Path |
|---------|---------------------|
| Dark Mode | Add Tailwind dark mode classes, toggle component |
| RSS Feed | Astro RSS integration (`@astrojs/rss`) |
| Search | Pagefind or Algolia integration |
| Comments | Giscus (GitHub Discussions) or similar |
| Analytics | Cloudflare Analytics or Plausible |
| Tags Filtering | Client-side filtering or tag pages |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-30 | Engineering | Initial technical design |

---

*This technical design document serves as the engineering blueprint for the personal website. It should be reviewed and updated as implementation progresses and new requirements emerge.*
