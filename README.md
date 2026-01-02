# One Byte Please

A personal website for technical writing, built with Astro, Tailwind CSS, and TypeScript.

## Project Structure

```
onebytepls/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions CI/CD workflow
│
├── config/
│   ├── site.ts                 # Site-wide configuration (title, author, social links)
│   └── theme.ts                # Theme configuration (colors, fonts, spacing)
│
├── src/
│   ├── content/
│   │   └── articles/           # Markdown articles
│   │       └── my-article/
│   │
│   ├── components/             # Reusable UI components
│   │   ├── ArticleCard.astro
│   │   ├── CoverPhoto.astro
│   │   ├── Footer.astro
│   │   ├── InfiniteScroll.tsx  
│   │   ├── Navigation.astro
│   │   ├── RecentArticles.astro
│   │   ├── SocialLinks.astro
│   │   ├── TagList.astro
│   │   └── YouTubeEmbed.astro
│   │
│   ├── layouts/
│   │   ├── ArticleLayout.astro
│   │   └── BaseLayout.astro
│   │
│   ├── pages/
│   │   ├── index.astro         
│   │   ├── about.astro         
│   │   └── articles/
│   │       ├── index.astro     
│   │       └── [...slug].astro
│   │
│   ├── styles/
│   │   └── global.css          # Global styles and Tailwind configuration
│   │
│   └── content.config.ts       # Content collection schema
│
├── public/
│   ├── images/                 # Static images (cover photo, avatar)
│   ├── favicon.svg
│   ├── robots.txt
│   └── _headers                # Cloudflare headers configuration
│
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The site will be available at `http://localhost:4321`.

### Building for Production

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Writing Articles

Articles are written in Markdown and stored in `src/content/articles/`.

### Article Frontmatter

Each article requires frontmatter:

```markdown
---
title: "Your Article Title"
date: 2025-01-15
description: "A brief description for listings and SEO"
tags:
  - javascript
  - tutorial
cover_image: ./cover.png  # Optional
---

Your article content here...
```

### Adding Images

Place images in the same directory as your article or use the public folder:

```markdown
![Alt text](./my-image.png)
```

### Code Blocks

Syntax highlighting is automatic. Specify the language:

```typescript
function hello(name: string): string {
  return `Hello, ${name}!`;
}
```

## Customization

### Site Configuration

Edit `config/site.ts` to customize:

- Site title and description
- Author information
- Social media links
- Navigation items

### Theme Configuration

Edit `config/theme.ts` to customize:

- Color palette
- Typography
- Spacing

### Styling

Global styles are in `src/styles/global.css`. The project uses Tailwind CSS v4 with custom theme variables.

## Deployment

The project includes a GitHub Actions workflow for deploying to Cloudflare R2. Configure these secrets in your repository:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID` (for cache purging)

## Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start local dev server at `localhost:4321`   |
| `npm run build`   | Build production site to `./dist/`           |
| `npm run preview` | Preview production build locally             |

## Tech Stack

- **Framework**: [Astro](https://astro.build)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Language**: TypeScript
- **Syntax Highlighting**: Shiki
- **Infinite Scroll**: React (island architecture)

## License

MIT
