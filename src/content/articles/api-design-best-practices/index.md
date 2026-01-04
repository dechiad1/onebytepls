---
title: "REST API Design Best Practices"
date: 2022-08-10
description: "Design APIs that developers love to use. The conventions, patterns, and common pitfalls to avoid."
tags:
  - api
  - rest
  - backend
  - best-practices
---

A well-designed API is a joy to work with. It is intuitive, consistent, & handles edge cases gracefully. This guide covers the principles that make APIs developer-friendly.

## Resource-Oriented Design

REST APIs are organized around resources. Use nouns, not verbs:

```
# Good
GET    /users
GET    /users/123
POST   /users
PUT    /users/123
DELETE /users/123

# Bad
GET    /getUsers
POST   /createUser
POST   /deleteUser/123
```

### Nested Resources

Use nesting to express relationships:

```
GET /users/123/orders        # Orders for user 123
GET /users/123/orders/456    # Specific order for user 123
POST /users/123/orders       # Create order for user 123
```

But avoid deep nesting. More than 2-3 levels becomes unwieldy:

```
# Too deep
GET /users/123/orders/456/items/789/reviews

# Prefer to use query parameters or separate endpoints
GET /order-items/789/reviews
GET /reviews?orderItemId=789
```

## HTTP Methods & Status Codes

Use HTTP methods according to their semantics:

| Method | Purpose | Idempotent |
| ------ | ------- | ---------- |
| GET | Retrieve resources | Yes |
| POST | Create resources | No |
| PUT | Replace resources | Yes |
| PATCH | Partial update | Yes |
| DELETE | Remove resources | Yes |

### Status Codes

Return appropriate status codes:

```
200 OK                    # Success for GET, PUT, PATCH
201 Created               # Success for POST (include Location header)
204 No Content            # Success for DELETE
400 Bad Request           # Invalid request data
401 Unauthorized          # Authentication required
403 Forbidden             # Authenticated but not authorized
404 Not Found             # Resource does not exist
409 Conflict              # Resource conflict (e.g., duplicate)
422 Unprocessable Entity  # Validation errors
500 Internal Server Error # Server-side error
```

## Request & Response Design

### Consistent Response Format

Use a consistent envelope:

```json
{
  "data": {
    "id": "123",
    "type": "user",
    "attributes": {
      "name": "Alice",
      "email": "alice@example.com"
    }
  },
  "meta": {
    "requestId": "abc-123"
  }
}
```

### Error Responses

Provide actionable error information:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be validated",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      },
      {
        "field": "age",
        "message": "Must be at least 18"
      }
    ]
  },
  "meta": {
    "requestId": "abc-123"
  }
}
```

## Pagination

For list endpoints, support pagination:

```
GET /users?page=2&pageSize=20
GET /users?offset=20&limit=20
GET /users?cursor=abc123&limit=20  # Cursor-based for large datasets
```

Include pagination metadata in responses:

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

## Filtering, Sorting, & Searching

### Filtering

Use query parameters for filtering:

```
GET /users?status=active
GET /users?role=admin&createdAfter=2024-01-01
GET /orders?status[]=pending&status[]=processing  # Multiple values
```

### Sorting

Provide a consistent sorting mechanism:

```
GET /users?sort=name          # Ascending
GET /users?sort=-createdAt    # Descending (prefix with -)
GET /users?sort=lastName,firstName  # Multiple fields
```

### Searching

For full-text search, use a dedicated parameter:

```
GET /users?search=alice
GET /products?q=laptop
```

## Versioning

Always version your API from the start:

```
# URL versioning (most common)
GET /v1/users
GET /v2/users

# Header versioning
GET /users
Accept: application/vnd.myapi.v1+json
```

## Security Considerations

### Authentication

Use an industry standard. JWT, for example, allows for authentication & authorization. If the user has a valid token from a trusted identity provider you can trust they are who they say they are. The token itself can carry claims, detailing what the user is allowed to do. 

```
# Bearer token (JWT)
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Rate Limiting

Communicate limits in headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

Return 429 when exceeded with a Retry-After header.

## Documentation

Document your API thoroughly:

- Use OpenAPI/Swagger for machine-readable specs
- Provide examples for every endpoint
- Document authentication requirements
- Include error response examples
- Keep docs in sync with code (generate from code if possible)

## Conclusion

Good API design requires thinking from the consumer's perspective. Be consistent, follow conventions, & handle errors gracefully. Your API is a product - treat it with the care it deserves.
