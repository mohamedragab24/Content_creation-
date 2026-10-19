require('dotenv').config();
const { app } = require('./app');
const { pool, demoMode } = require('./db');
const port = Number(process.env.PORT || 3000);
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.error('JWT_SECRET must be configured with at least 32 characters in production.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && demoMode) {
  console.error('DATABASE_URL must be configured in production; in-memory demo data is not durable.');
  process.exit(1);
}
const server=app.listen(port,'0.0.0.0',()=>console.log(`Souqna server listening on 0.0.0.0:${port} (${demoMode?'demo data':'PostgreSQL'})`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(async()=>{if(pool)await pool.end();process.exit(0);}));
