import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserAuthentication1773000000000 implements MigrationInterface {
  name = 'AddUserAuthentication1773000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified_at timestamptz NULL
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        password_updated_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_user_credentials_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_auth_methods (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        method varchar(32) NOT NULL,
        provider varchar(120) NOT NULL,
        provider_subject varchar(255) NOT NULL,
        email varchar(255) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_user_auth_methods_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_user_auth_methods_provider_subject UNIQUE (method, provider, provider_subject)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        refresh_token_hash varchar(128) NOT NULL,
        user_agent varchar(500) NULL,
        ip_address varchar(120) NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        rotated_at timestamptz NULL,
        CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_security_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        token_type varchar(40) NOT NULL,
        token_hash varchar(128) NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_user_security_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions (user_id, revoked_at)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_user_security_tokens_lookup ON user_security_tokens (token_type, token_hash)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_security_tokens_lookup');
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_sessions_user_active');
    await queryRunner.query('DROP TABLE IF EXISTS user_security_tokens');
    await queryRunner.query('DROP TABLE IF EXISTS user_sessions');
    await queryRunner.query('DROP TABLE IF EXISTS user_auth_methods');
    await queryRunner.query('DROP TABLE IF EXISTS user_credentials');
    await queryRunner.query('ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at');
  }
}
