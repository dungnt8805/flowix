import { MigrationInterface, QueryRunner } from 'typeorm';

const defaultRoles = [
  {
    name: 'owner',
    permissions: [
      'workspace:manage',
      'workspace:member:add',
      'workspace:member:remove',
      'workspace:member:update',
      'project:create',
      'diagram:create',
      'diagram:update',
      'diagram:delete',
      'diagram:comment',
      'diagram:view',
      'diagram:export',
      'diagram:share'
    ]
  },
  {
    name: 'admin',
    permissions: [
      'workspace:manage',
      'workspace:member:add',
      'workspace:member:remove',
      'workspace:member:update',
      'project:create',
      'diagram:create',
      'diagram:update',
      'diagram:delete',
      'diagram:comment',
      'diagram:view',
      'diagram:export',
      'diagram:share'
    ]
  },
  {
    name: 'editor',
    permissions: [
      'diagram:create',
      'diagram:update',
      'diagram:delete',
      'diagram:comment',
      'diagram:view',
      'diagram:export',
      'diagram:share'
    ]
  },
  {
    name: 'commenter',
    permissions: ['diagram:comment', 'diagram:view', 'diagram:export']
  },
  {
    name: 'viewer',
    permissions: ['diagram:view', 'diagram:export']
  }
] as const;

export class DynamicRBAC1779095246160 implements MigrationInterface {
  name = 'DynamicRBAC1779095246160';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspace_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NULL,
        name varchar(100) NOT NULL,
        permissions varchar[] NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_workspace_roles_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_roles_global_name
      ON workspace_roles (name)
      WHERE workspace_id IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_roles_workspace_name
      ON workspace_roles (workspace_id, name)
      WHERE workspace_id IS NOT NULL
    `);

    for (const role of defaultRoles) {
      await queryRunner.query(
        `
          INSERT INTO workspace_roles (name, workspace_id, permissions)
          VALUES ($1, NULL, $2)
          ON CONFLICT (name) WHERE workspace_id IS NULL
          DO UPDATE SET permissions = EXCLUDED.permissions, updated_at = now()
        `,
        [role.name, role.permissions]
      );
    }

    await queryRunner.query(`
      ALTER TABLE workspace_members
      ADD COLUMN IF NOT EXISTS role_id uuid NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'workspace_members'
            AND column_name = 'role'
        ) THEN
          UPDATE workspace_members member
          SET role_id = role.id
          FROM workspace_roles role
          WHERE member.role_id IS NULL
            AND role.workspace_id IS NULL
            AND role.name = member.role;
        END IF;
      END
      $$;
    `);
    await queryRunner.query(`
      UPDATE workspace_members member
      SET role_id = role.id
      FROM workspace_roles role
      WHERE member.role_id IS NULL
        AND role.workspace_id IS NULL
        AND role.name = 'viewer'
    `);
    await queryRunner.query(`
      ALTER TABLE workspace_members
      ALTER COLUMN role_id SET NOT NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_workspace_members_role'
        ) THEN
          ALTER TABLE workspace_members
          ADD CONSTRAINT fk_workspace_members_role
          FOREIGN KEY (role_id) REFERENCES workspace_roles(id) ON DELETE RESTRICT;
        END IF;
      END
      $$;
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members (role_id)');
    await queryRunner.query('ALTER TABLE workspace_members DROP COLUMN IF EXISTS role');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE workspace_members
      ADD COLUMN IF NOT EXISTS role varchar(20) NULL
    `);
    await queryRunner.query(`
      UPDATE workspace_members member
      SET role = role.name
      FROM workspace_roles role
      WHERE member.role_id = role.id
    `);
    await queryRunner.query(`
      ALTER TABLE workspace_members
      ALTER COLUMN role SET NOT NULL
    `);
    await queryRunner.query('DROP INDEX IF EXISTS idx_workspace_members_role');
    await queryRunner.query('ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS fk_workspace_members_role');
    await queryRunner.query('ALTER TABLE workspace_members DROP COLUMN IF EXISTS role_id');
    await queryRunner.query('DROP INDEX IF EXISTS uq_workspace_roles_workspace_name');
    await queryRunner.query('DROP INDEX IF EXISTS uq_workspace_roles_global_name');
    await queryRunner.query('DROP TABLE IF EXISTS workspace_roles');
  }
}
