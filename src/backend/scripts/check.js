import pg from 'pg';
const pool = new pg.Pool({connectionString: 'postgresql://postgres:LcJfAEGISJyMkRzRZtUvUYCwlYZVVVzd@trolley.proxy.rlwy.net:52469/railway'});
pool.query("ALTER TABLE app_users ALTER COLUMN created_at SET DEFAULT now(); ALTER TABLE app_users ALTER COLUMN updated_at SET DEFAULT now();")
  .then(() => console.log("Defaults added"))
  .catch(console.error)
  .finally(() => pool.end());
