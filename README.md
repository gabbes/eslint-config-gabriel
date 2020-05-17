# Auth API

A little authentication service for some of my personal projects.

## Development

- `yarn`
- `yarn tsc -w`
- `DATABASE_URL="postgres://localhost:5432/DATABASE" NODE_ENV="development" yarn nodemon build/index.js`

## Production

- `yarn`
- `yarn tsc`
- `yarn --production`
- `DATABASE_URL="postgres://localhost:5432/DATABASE" node build/index.js`

## License

[MIT](./LICENSE)
