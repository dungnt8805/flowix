import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'user_auth_methods' })
@Index('uq_user_auth_methods_provider_subject', ['method', 'provider', 'providerSubject'], { unique: true })
export class UserAuthMethodEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  method!: 'password' | 'oidc';

  @Column({ type: 'varchar', length: 120 })
  provider!: string;

  @Column({ name: 'provider_subject', type: 'varchar', length: 255 })
  providerSubject!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
