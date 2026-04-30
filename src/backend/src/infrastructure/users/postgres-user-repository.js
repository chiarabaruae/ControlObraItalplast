import { UserRepository } from "../../application/auth/ports/user-repository.js";
import { createUser } from "../../domain/users/user.js";

export class PostgresUserRepository extends UserRepository {
  constructor({ pool }) {
    super();
    this.pool = pool;
  }

  async findByUsername(username) {
    const result = await this.pool.query(
      `
        select
          id,
          username,
          display_name,
          role,
          password_hash,
          is_active
        from app_users
        where lower(username) = lower($1)
        limit 1
      `,
      [username]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return createUser({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      passwordHash: row.password_hash,
      isActive: row.is_active
    });
  }
}
