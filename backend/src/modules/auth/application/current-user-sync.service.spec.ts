import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { UserEntity } from '../../users/infrastructure/persistence/user.entity';
import { CurrentUserSyncService } from './current-user-sync.service';

describe('CurrentUserSyncService', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Diagram Author'
  };

  it('creates the user when it does not exist', async () => {
    const findOneBy = jest.fn().mockResolvedValue(null);
    const save = jest.fn().mockResolvedValue(undefined);
    const service = new CurrentUserSyncService({
      findOneBy,
      save
    } as unknown as Repository<UserEntity>);

    await service.ensureUser(user);

    expect(save).toHaveBeenCalledWith({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: null
    });
  });

  it('updates the user when profile fields changed', async () => {
    const existingUser = {
      id: user.id,
      email: 'old@example.com',
      displayName: null
    } as UserEntity;
    const findOneBy = jest.fn().mockResolvedValue(existingUser);
    const save = jest.fn().mockResolvedValue(undefined);
    const service = new CurrentUserSyncService({
      findOneBy,
      save
    } as unknown as Repository<UserEntity>);

    await service.ensureUser(user);

    expect(existingUser.email).toBe('user@example.com');
    expect(existingUser.displayName).toBe('Diagram Author');
    expect(save).toHaveBeenCalledWith(existingUser);
  });

  it('does nothing when the user is already current', async () => {
    const existingUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName
    } as UserEntity;
    const findOneBy = jest.fn().mockResolvedValue(existingUser);
    const save = jest.fn().mockResolvedValue(undefined);
    const service = new CurrentUserSyncService({
      findOneBy,
      save
    } as unknown as Repository<UserEntity>);

    await service.ensureUser(user);

    expect(save).not.toHaveBeenCalled();
  });
});
