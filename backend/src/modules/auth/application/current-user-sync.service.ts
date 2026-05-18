import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { UserEntity } from '../../users/infrastructure/persistence/user.entity';

@Injectable()
export class CurrentUserSyncService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async ensureUser(user: AuthenticatedUser): Promise<void> {
    const existingUser = await this.userRepository.findOneBy({ id: user.id });

    if (existingUser === null) {
      await this.userRepository.save({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: null
      });
      return;
    }

    const nextDisplayName = user.displayName;
    if (existingUser.email === user.email && existingUser.displayName === nextDisplayName) {
      return;
    }

    existingUser.email = user.email;
    existingUser.displayName = nextDisplayName;
    await this.userRepository.save(existingUser);
  }
}
