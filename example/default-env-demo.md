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

### Testing Auto-Detection

1. **Test Named Env File Detection:**
   - Open `example/users/users.hurl`
   - Check the status bar - it should show `users/users.env (auto)`
   - Run the Hurl request - variables from `users.env` will be automatically loaded

2. **Test .env Priority:**
   - Open `example/posts/posts.hurl`
   - Check the status bar - it should show `posts/.env (auto)` (not `posts.env`)
   - Run the Hurl request - variables from `.env` will be loaded instead of `posts.env`

3. **Test Manual Selection Override:**
   - Open any .hurl file
   - Use `Ctrl+Shift+P` → "Hurl: Choose Environment File"
   - Select a different env file manually
   - Check the status bar - it should show the manual selection without "(auto)"
   - Manual selection takes precedence over auto-detection

### Expected Behavior

- **Auto-detected files** show "(auto)" indicator in status bar
- **Manually selected files** show without "(auto)" indicator
- **.env files** are prioritized over named env files (e.g., `scene1.env`)
- **Manual selection** always overrides auto-detection