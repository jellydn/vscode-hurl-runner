# Example: Default .env File Auto-Detection

This example demonstrates the new automatic .env file detection feature.

## Directory Structure

```
example/
├── users/
│   ├── users.hurl     # Will auto-detect users.env
│   └── users.env
└── posts/
    ├── posts.hurl     # Will auto-detect .env (prioritized over posts.env)
    ├── posts.env
    └── .env
```

## How It Works

1. **Named env files**: `users.hurl` will automatically use `users.env`
2. **Default .env priority**: `posts.hurl` will use `.env` instead of `posts.env`
3. **Manual selection overrides**: You can still manually select any env file
4. **Status bar indication**: Auto-detected files show "(auto)" in the status bar

## Test It

1. Open any .hurl file in the example directories
2. Check the status bar - it should show the auto-detected env file
3. Run the Hurl request - variables from the env file will be automatically loaded
4. Manual env file selection still works and takes precedence