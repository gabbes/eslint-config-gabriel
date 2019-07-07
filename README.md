# Auth Services

Authentication service for some of my personal projects.

## Development

- `yarn` Install dependencies.
- `yarn tsc -w` Watch and compile TypeScript files to JavaScript on changes.
- `DATABASE_URL="postgres://localhost:5432/DATABASE" NODE_ENV="development" yarn nodemon build/index.js` Start live-reloading app.

## Testing

- `DATABASE_URL="postgres://localhost:5432/DATABASE" yarn jest --verbose` Runs tests.

## Production

- `yarn` Install dependencies.
- `yarn tsc` Compile TypeScript files to JavaScript.
- `yarn --production` Remove development dependencies.
- `DATABASE_URL="postgres://localhost:5432/DATABASE" node build/index.js` Start app.

## License

[MIT](./LICENSE)
