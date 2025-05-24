# Wefy—Modern HTTP Client with Extensible Architecture

[![npm version](https://img.shields.io/npm/v/wefy)](https://www.npmjs.com/package/wefy)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A powerful, type-safe HTTP client for TypeScript/JavaScript with advanced features like scoping, decoration, and
built-in response handling.

## Features

- 🚀 **Type-safe** — Full TypeScript support with generic types
- 🎯 **Scoped requests** — Organize related API calls into logical scopes
- 🎨 **Decoration** — Create pre-configured client instances
- ⚡ **Timeout handling** — Built-in request timeouts with custom error handling
- 🔧 **Flexible configuration** — Per-request and global configuration options
- 🛡️ **Error handling** — Custom error types for timeouts and parsing
- 🔄 **Raw responses** — Access to raw fetch responses when needed
- 📦 **Immutable** — Uses Immer for immutable updates

## Installation

```bash
npm install wefy
# or
yarn add wefy
# or
pnpm add wefy
```

## Quick Start

```typescript
import {Wefy} from 'wefy';

// Create a client instance
const api = Wefy.create('https://api.example.com');

// Make requests
const users = await api.get<User[]>('/users');
const newUser = await api.post<User, CreateUserData>('/users', userData);
```

## Basic Usage

### Creating a Client

```typescript
// Simple base URL
const api = Wefy.create('https://api.example.com');
```

```typescript
// Full configuration
const api = Wefy.create({
  baseUrl: 'https://api.example.com',
  timeout: 10000,
  options: {
    headers: {
      'Authorization': 'Bearer token',
      'Content-Type': 'application/json'
    }
  }
});
```

### HTTP Methods

All standard HTTP methods are supported with full type safety:

```typescript
// GET request
const users = await api.get<User[]>('/users');

// POST request with body
const newUser = await api.post<User, CreateUserRequest>('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updatedUser = await api.put<User, UpdateUserRequest>('/users/1', {
  name: 'Jane Doe'
});

// PATCH request
const patchedUser = await api.patch<User, Partial<User>>('/users/1', {
  email: 'jane@example.com'
});

// DELETE request
await api.delete('/users/1');
```

### Request Configuration

Override default settings on a per-request basis:

```typescript
const data = await api.get<ApiResponse>('/data', {
  timeout: 15000,
  params: {page: 1, limit: 10},
  encode: false,
  preserveEncoding: true,
  options: {
    headers: {
      'Custom-Header': 'value'
    }
  }
});
```

## Advanced Features

### Scoping

Create logical groups of related API methods:

```typescript
// Object-based scoping
const api = Wefy.create('https://api.example.com')
  .scope('users', {
    async getAll() {
      return this.get<User[]>('/users');
    },

    async getById(id: string) {
      return this.get<User>(`/users/${id}`);
    },

    async create(userData: CreateUserData) {
      return this.post<User>('/users', userData);
    }
  });

// Use scoped methods
const users = await api.users.getAll();
const user = await api.users.getById('123');

// Function-based scoping with context
const api2 = Wefy.create('https://api.example.com')
  .scope('auth', (ctx) => ({
    async login(credentials: LoginData) {
      const response = await ctx.post<AuthResponse>('/auth/login', credentials);
      // Store token in scope state
      ctx.state.set('token', response.token);
      return response;
    },

    async getProfile() {
      const token = ctx.state.get('token');
      return ctx.get<UserProfile>('/auth/profile', {
        options: {
          headers: {Authorization: `Bearer ${token}`}
        }
      });
    },

    // Create a decorated context with auth headers
    authenticated() {
      const token = ctx.state.get('token');
      return ctx.decorate({
        options: {
          headers: {Authorization: `Bearer ${token}`}
        }
      });
    }
  }));

// Usage
await api2.auth.login({username: 'user', password: 'pass'});
const profile = await api2.auth.getProfile();

// Or use the decorated context
const authCtx = api2.auth.authenticated();
const protectedData = await authCtx.get('/protected-endpoint');
```

### Scoped Configuration

Apply configuration to specific scopes:

```typescript
const api = Wefy.create('https://api.example.com')
  .scope('admin', {
    async getUsers() {
      return this.get<User[]>('/admin/users');
    }
  }, {
    // Scope-specific configuration
    timeout: 30000,
    options: {
      headers: {
        'X-Admin-Key': 'admin-secret'
      }
    }
  });
```

### Decoration

Create pre-configured client instances:

```typescript
const api = Wefy.create('https://api.example.com');

const authenticatedApi = api.decorate('auth', {
  options: {
    headers: {
      'Authorization': 'Bearer token123'
    }
  }
});

// Use the decorated instance
const userData = await authenticatedApi.auth.get<User>('/profile');

// Chain decorations
const adminApi = authenticatedApi.auth.decorate('admin', {
  timeout: 30000,
  options: {
    headers: {
      'X-Admin-Role': 'super-admin'
    }
  }
});
```

### Raw Responses

Access raw fetch responses when needed:

```typescript
const api = Wefy.create('https://api.example.com');

// Get raw response
const rawResponse = await api.raw.get('/users');
console.log(rawResponse.status, rawResponse.headers);

// Manual response handling
const response = await api.request('GET', '/users', undefined, undefined, true);
if (response.ok) {
  const data = await response.json();
}
```

### URL Parameters

```typescript
// Query parameters
const users = await api.get<User[]>('/users', {
  params: {
    page: 1,
    limit: 10,
    sort: 'name',
    active: true
  }
});
// Requests: /users?page=1&limit=10&sort=name&active=true

// Absolute URLs (bypasses baseUrl)
const externalData = await api.get('https://external-api.com/data');
```

## Error Handling

Wefy provides custom error types for better error handling:

```typescript
import {WefyTimeoutError, WefyParseError} from 'wefy';

try {
  const data = await api.get('/slow-endpoint');
} catch (error) {
  if (error instanceof WefyTimeoutError) {
    console.log(`Request timed out after ${error.timeout}ms`);
  } else if (error instanceof WefyParseError) {
    console.log('Failed to parse response');
  } else {
    console.log('Request failed:', error.message);
  }
}
```

## Response Handling

The default response handling automatically parses JSON and handles common response types. For custom handling, use raw
responses:

```typescript
// Automatic JSON parsing (default)
const users = await api.get<User[]>('/users');

// Raw response for custom handling
const response = await api.raw.get('/users');
const contentType = response.headers.get('content-type');

if (contentType?.includes('application/json')) {
  const users = await response.json();
} else if (contentType?.includes('text/')) {
  const text = await response.text();
}
```

## Scope Management

```typescript
const api = Wefy.create('https://api.example.com')
  .scope('users', userMethods)
  .scope('posts', postMethods);

// Check if scope exists
if (api.hasScope('users')) {
  console.log('Users scope is available');
}

// List all scopes
console.log('Available scopes:', api.listScopes()); // ['users', 'posts']

// Get scope information
const scopeInfo = api.getScopeInfo('users');
console.log('Scope state:', scopeInfo?.state);
console.log('Scope config:', scopeInfo?.config);
```

## TypeScript Support

Wefy is built with TypeScript and provides excellent type safety:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
}

interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

// Fully typed requests and responses
const api = Wefy.create('https://api.example.com');

const users = await api.get<ApiResponse<User[]>>('/users');
// users is typed as ApiResponse<User[]>

const newUser = await api.post<ApiResponse<User>, CreateUserRequest>('/users', {
  name: 'John',
  email: 'john@example.com'
});
// Request body is typed as CreateUserRequest
// Response is typed as ApiResponse<User>
```

## Configuration Options

### WefyConfig

```typescript
interface WefyConfig {
  baseUrl: string;           // Base URL for all requests (required)
  timeout?: number;          // Default timeout in milliseconds (default: 5000)
  options?: RequestInit;     // Default fetch options
}
```

### WefyRequestConfig

```typescript
interface WefyRequestConfig {
  timeout?: number;                    // Request timeout
  params?: Record<string, unknown>;    // URL query parameters
  encode?: boolean;                    // Encode URL parameters (default: true)
  preserveEncoding?: boolean;          // Preserve existing encoding (default: true)
  options?: RequestInit;              // Fetch options for this request
}
```

## Examples

### Building a Complete API Client

```typescript
interface TodoItem {
  id: number;
  title: string;
  completed: boolean;
  userId: number;
}

const todoApi = Wefy.create('https://jsonplaceholder.typicode.com')
  .scope('todos', (ctx) => ({
    async getAll() {
      return ctx.get<TodoItem[]>('/todos');
    },

    async getById(id: number) {
      return ctx.get<TodoItem>(`/todos/${id}`);
    },

    async create(todo: Omit<TodoItem, 'id'>) {
      return ctx.post<TodoItem>('/todos', todo);
    },

    async update(id: number, todo: Partial<TodoItem>) {
      return ctx.put<TodoItem>(`/todos/${id}`, {...todo, id});
    },

    async delete(id: number) {
      return ctx.delete(`/todos/${id}`);
    },

    async getByUser(userId: number) {
      return ctx.get<TodoItem[]>('/todos', {
        params: {userId}
      });
    }
  }))
  .scope('users', (ctx) => ({
    async getAll() {
      return ctx.get<User[]>('/users');
    },

    async getById(id: number) {
      return ctx.get<User>(`/users/${id}`);
    }
  }));

// Usage
const todos = await todoApi.todos.getAll();
const userTodos = await todoApi.todos.getByUser(1);
const users = await todoApi.users.getAll();
```

### Authentication Flow

```typescript
const api = Wefy.create('https://api.example.com')
  .scope('auth', (ctx) => {
    let authToken: string | null = null;

    return {
      async login(credentials: { email: string; password: string }) {
        const response = await ctx.post<{ token: string; user: User }>('/auth/login', credentials);
        authToken = response.token;
        ctx.state.set('token', authToken);
        ctx.state.set('user', response.user);
        return response;
      },

      async logout() {
        const token = ctx.state.get('token');
        if (token) {
          await ctx.post('/auth/logout', {}, {
            options: {
              headers: {Authorization: `Bearer ${token}`}
            }
          });
        }
        authToken = null;
        ctx.state.delete('token');
        ctx.state.delete('user');
      },

      getAuthenticatedContext() {
        const token = ctx.state.get('token');
        if (!token) throw new Error('Not authenticated');

        return ctx.decorate({
          options: {
            headers: {Authorization: `Bearer ${token}`}
          }
        });
      },

      isAuthenticated() {
        return ctx.state.has('token');
      }
    };
  });

// Login and use authenticated requests
await api.auth.login({email: 'user@example.com', password: 'password'});

if (api.auth.isAuthenticated()) {
  const authCtx = api.auth.getAuthenticatedContext();
  const profile = await authCtx.get<UserProfile>('/profile');
  const settings = await authCtx.get<UserSettings>('/settings');
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.