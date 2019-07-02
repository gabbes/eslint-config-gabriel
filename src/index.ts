import { app } from './app';

const env = process.env.NODE_ENV || 'production';
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(port, host, () => {
  console.log(`🚀  Running ${env} build @ ${host}:${port}!`);
});
