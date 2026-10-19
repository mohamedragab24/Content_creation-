require('dotenv').config();
const bcrypt=require('bcryptjs');
const { pool,demoMode,query }=require('./db');
(async()=>{
 if(demoMode)throw new Error('DATABASE_URL is required for seeding PostgreSQL.');
 const accounts=[
  ['admin-1','مدير سوقنا','admin@souqna.demo','admin'],
  ['seller-1','بائع سوقنا','seller@souqna.demo','seller'],
  ['user-1','مستخدم سوقنا','user@souqna.demo','user'],
 ];
 const hash=await bcrypt.hash('SouqnaDemo1!',12);
 for(const [id,name,email,role] of accounts){
  await query('INSERT INTO users(id,name,email,password_hash,role,status) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email) DO NOTHING',[id,name,email,hash,role,'active']);
 }
 await query("INSERT INTO seller_profiles(user_id,store_name,status) VALUES('seller-1','متجر التقنية','active') ON CONFLICT(user_id) DO NOTHING");
 console.log('Demo accounts created (change passwords before production use).');
 await pool.end();
})().catch(async e=>{console.error(e.message);if(pool)await pool.end();process.exit(1);});
