import pg from 'pg';

const { Client } = pg;

const client = new Client({ connectionString: 'postgresql://postgres.maynbahqthdjpmnfmeqh:W86.DYqM%26Hey%24xg@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require' });

client.connect()
  .then(() => {
    console.log("Connected. Running update...");
    return client.query("UPDATE auth.users SET email_confirmed_at = now() WHERE email = 'codezarella685@gmail.com' RETURNING id, email, email_confirmed_at;");
  })
  .then(res => {
    console.log('Updated user:');
    console.table(res.rows);
    return client.end();
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
