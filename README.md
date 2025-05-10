# Wefy - Modern HTTP Client with Extensible Architecture

[![npm version](https://img.shields.io/npm/v/wefy)](https://www.npmjs.com/package/wefy)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Wefy is a TypeScript-first HTTP client designed for modern web applications, featuring a powerful extension system and robust type safety.

## Features

- 🚀 Promise-based API with async/await support
- 🔌 Extensible middleware system
- 🛡️ Built-in timeout and request cancellation
- 🔄 Automatic request/response transformation
- 📦 First-class TypeScript support
- 🧩 Modular architecture with plugin system

## Installation

```bash
npm install wefy
# or
yarn add wefy
```

## Basic Usage

```typescript
import { Wefy } from 'wefy';

// Create client instance
const api = Wefy.create({
  baseUrl: 'https://api.example.com/v1',
  timeout: 10000,
});

// GET request
const user = await api.get<User>('/users/123', {
  params: { include: 'profile' }
});

// POST request
const newPost = await api.post<Post>('/posts', {
  body: { title: 'Hello Wefy', content: '...' },
  options: {
    headers: { 'X-Custom-Header': 'value' }
  }
});
```

## Advanced Configuration

### Request Cancellation

```typescript
const controller = new AbortController();

api.get('/data', {
  options: { signal: controller.signal }
});

// Cancel request
controller.abort();
```

### Response Interception

```typescript
const response = await api.get('/data').raw();
console.log(response.headers.get('X-RateLimit-Limit'));
```

## Extensions System

Wefy's power comes from its extensible architecture. Create custom extensions to modify requests/responses.

### Creating Extensions

```typescript
import { createExtension } from 'wefy';

const LoggerExtension = createExtension({
  name: 'logger',
  hooks: {
    async beforeRequest({ method, endpoint }, ctx) {
      console.log(`[${method}] ${endpoint}`);
      ctx.setSharedState('startTime', Date.now());
    },
    
    async afterRequest({ success, duration }, ctx) {
      const start = ctx.getSharedState('startTime');
      console.log(`Request completed in ${Date.now() - start}ms`);
    }
  }
});
```

### Using Extensions

```typescript
const api = Wefy.create({
  baseUrl: 'https://api.example.com',
  extensions: {
    use: [LoggerExtension, CacheExtension],
    config: {
      cache: { ttl: 60000 }
    }
  }
});
```

## Available Extension Hooks

| Hook Name       | Description                          | Parameters                          |
|-----------------|--------------------------------------|-------------------------------------|
| `init`          | Extension initialization            | Global config                       |
| `beforeRequest` | Pre-request processing               | Method, endpoint, config           |
| `onRequest`     | Request final modification           | URL, headers, body                 |
| `beforeResponse`| Pre-response processing              | Response object, duration           |
| `onResponse`    | Response data handling               | Response object, parsed data        |
| `afterSuccess`  | Post-success processing              | Final data, response metadata       |
| `onError`       | Error handling                       | Error object, request context       |
| `afterRequest`  | Final cleanup                        | Success status, duration            |
| `onStateChange` | React to state changes               | Previous and new state              |

## Error Handling

```typescript
try {
  await api.get('/protected-resource');
} catch (error) {
  if (error instanceof WefyError) {
    console.error(`API Error ${error.status}:`, error.message);
    if (error.status === 401) {
      // Handle unauthorized
    }
  }
}
```

## TypeScript Support

Wefy provides full type safety:

```typescript
interface User {
  id: number;
  name: string;
}

// Type-safe response
const user = await api.get<User>('/users/123');

// Type-checked request body
await api.post<User>('/users', {
  body: {
    name: 'John',
    age: 30  // Error: Not in User interface
  }
});
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT © [topsinoty-ee](https://github.com/topsinoty-ee)

---

**Wefy** is designed for modern web development needs. Its extensible architecture and type-safe approach make it ideal for projects requiring flexibility and reliability. Start building with Wefy today and extend the possibilities of HTTP communication!


This README provides:
- Clean visual hierarchy
- Immediate code examples
- TypeScript-first examples
- Clear extension documentation
- Error handling guidance
- Contribution guidelines
- Modular structure for easy scanning
- Badges for quick project status
- Links to extension ecosystem

The documentation emphasizes Wefy's unique value proposition while maintaining practical usability.