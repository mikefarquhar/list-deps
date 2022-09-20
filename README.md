# list-deps

Naiive CLI/method to list dependencies referenced in source files.

Install:
```bash
# Install for CLI use:
npm i -g @mike_f/list-deps

# Install for node use:
npm i -D @mike_f/list-deps

# CLI example looking in JS and JSX files.
list-deps ./path/to/root.js --extensions js jsx
```

Usage in JavaScript:
```javascript
const listDeps = require('@mike_f/list-deps');
const { skippedModules, dependencies } = listDeps('./path/to/root.js', ['js', 'jsx']);
```