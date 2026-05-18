import { randomUUID } from 'node:crypto';

interface CreateWorkspaceProps {
  id?: string;
  name: string;
  slug: string;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Workspace {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly createdBy: string,
    readonly createdAt: Date,
    readonly updatedAt: Date
  ) {}

  static create(props: CreateWorkspaceProps): Workspace {
    const name = props.name.trim();
    const slug = props.slug.trim();

    if (name.length === 0) {
      throw new Error('Workspace name is required.');
    }

    if (slug.length === 0) {
      throw new Error('Workspace slug is required.');
    }

    const now = new Date();

    return new Workspace(
      props.id ?? randomUUID(),
      name,
      slug,
      props.createdBy,
      props.createdAt ?? now,
      props.updatedAt ?? now
    );
  }
}
