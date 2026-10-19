const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const { demoMode } = require('./db');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
      connectSrc: ["'self'", 'https:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'", 'https://*.manus.computer'],
    },
  },
}));
const allowed = (process.env.CORS_ORIGIN||'').split(',').map((x)=>x.trim()).filter(Boolean);
if (allowed.length) app.use(cors({ origin: allowed }));
app.use(express.json({ limit:'1mb' }));
app.use(express.static(path.join(__dirname,'..','public'), { etag:true, maxAge: process.env.NODE_ENV==='production'?'1h':0 }));
app.use('/api',routes);
app.get('/health', (_req,res)=>res.json({ok:true,service:'souqna',mode:demoMode?'demo':'postgresql'}));
app.get('*', (_req,res)=>res.sendFile(path.join(__dirname,'..','public','index.html')));
app.use((err,_req,res,_next)=>{
  console.error('[souqna-api]',err.message);
  if(err.code==='23505')return res.status(409).json({error:'السجل موجود مسبقًا.'});
  const status=err.status||500;
  res.status(status).json({error:process.env.NODE_ENV==='production'?'حدث خطأ في الخادم.':err.message});
});

module.exports={app};
