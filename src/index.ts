import { app } from './app';
import { databaseMigration } from './database';

(async () => {
  const env = process.env.NODE_ENV || 'production';
  const host = process.env.HOST || '0.0.0.0';
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  await databaseMigration();

  app.listen(port, host, () => {
    console.log(`🚀  Running ${env} build @ ${host}:${port}!`);
  });
})();
