/**
 * Site-wide configuration.
 * Modify these values to customize site metadata, navigation, and social links.
 */

export const site = {
  title: 'Communication is the most important bit of software.',
  description: 'Essays on software in the workplace, and various other interests. Written as a practice in clarity and communication.',
  copywrite: '© 2025 onebytepls. Opinions are my own.',
  url: 'https://onebytepls.com',
  language: 'en',

  author: {
    name: 'Daniel DeChiara',
    bio: `Software engineer passionate about building scalable systems and sharing knowledge.
    I write about software architecture, development best practices, and lessons learned from real-world projects.`,
    avatar: '/images/avatar.jpg',
  },

  social: {
    linkedin: 'https://linkedin.com/in/danieldechiara/',
    github: 'https://github.com/dechiad1',
  },

  navigation: [
    { label: 'Articles', href: '/articles' },
    { label: 'About', href: '/about' },
  ],

  // Number of recent articles to show on the home page
  recentArticlesCount: 5,

  // Number of articles to load per batch on the articles page (infinite scroll)
  articlesPerBatch: 10,

  // Cover photo for the home page
  coverImage: '/images/cover.jpg',
} as const;

export type Site = typeof site;
