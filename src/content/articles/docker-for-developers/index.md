---
title: "Docker for Developers: A Practical Introduction"
date: 2025-12-15
description: "Learn how Docker can simplify your development workflow, from local development to production deployment."
tags:
  - docker
  - devops
  - tutorial
---

Docker has revolutionized how we develop, ship, and run applications. This guide will help you understand Docker concepts and start using it effectively in your development workflow.

## Why Docker?

Docker solves the "it works on my machine" problem by packaging applications with their dependencies into containers. Benefits include:

- **Consistent Environments**: Development, staging, and production run identical containers
- **Isolation**: Each container runs in its own environment
- **Reproducibility**: Anyone can build and run your application
- **Resource Efficiency**: Containers share the host OS kernel, using less resources than VMs

## Core Concepts

### Images vs Containers

- **Image**: A read-only template containing the application and its dependencies
- **Container**: A running instance of an image

Think of images as classes and containers as instances.

### Dockerfile

A Dockerfile defines how to build an image:

```dockerfile
# Use an official Node.js runtime as base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run
CMD ["node", "server.js"]
```

### Building and Running

```bash
# Build an image
docker build -t my-app:latest .

# Run a container
docker run -p 3000:3000 my-app:latest

# Run in background (detached)
docker run -d -p 3000:3000 --name my-app-container my-app:latest

# View running containers
docker ps

# Stop a container
docker stop my-app-container

# Remove a container
docker rm my-app-container
```

## Docker Compose for Development

Docker Compose orchestrates multi-container applications. Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
      - cache

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  cache:
    image: redis:7-alpine
    ports:
      - '6379:6379'

volumes:
  postgres_data:
```

Start everything with:

```bash
docker compose up -d
```

## Best Practices

### Optimize for Layer Caching

Docker caches each layer. Order Dockerfile instructions from least to most frequently changed:

```dockerfile
# Good: Dependencies change less often than code
COPY package*.json ./
RUN npm ci
COPY . .

# Bad: Any code change invalidates npm install cache
COPY . .
RUN npm ci
```

### Use Multi-Stage Builds

Reduce image size by separating build and runtime stages:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Use .dockerignore

Prevent unnecessary files from being copied:

```
node_modules
.git
.env
*.log
dist
coverage
.DS_Store
```

### Health Checks

Add health checks to your containers:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## Development Workflow Tips

### Hot Reloading with Volumes

Mount your source code for live reloading:

```yaml
services:
  app:
    volumes:
      - .:/app
      - /app/node_modules # Prevent overwriting node_modules
```

### Running Commands in Containers

```bash
# Execute a command in a running container
docker compose exec app npm test

# Run a one-off command
docker compose run --rm app npm run migration
```

### Viewing Logs

```bash
# Follow logs
docker compose logs -f app

# View last 100 lines
docker compose logs --tail=100 app
```

## Conclusion

Docker simplifies development by providing consistent, reproducible environments. Start with simple Dockerfiles, use Docker Compose for multi-service applications, and follow best practices for efficient images.

The investment in learning Docker pays off quickly in reduced environment issues and smoother deployments.
