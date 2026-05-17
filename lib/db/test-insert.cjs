const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.maynbahqthdjpmnfmeqh:W86.DYqM%26Hey%24xg@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?uselibpqcompat=true&sslmode=require' });

client.connect()
  .then(() => client.query("INSERT INTO users (email, name, role, password) VALUES ('test101@gmail.com', 'test', 'user', '') RETURNING *;"))
  .then(res => {
    console.table(res.rows);
    return client.query("DELETE FROM users WHERE email = 'test101@gmail.com'");
  })
  .then(() => client.end())
  .catch(err => {
    console.error('INSERT ERROR:', err);
    client.end();
  });
