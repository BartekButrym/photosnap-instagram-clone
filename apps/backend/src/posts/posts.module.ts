import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsRouter } from './posts.router';
import { UsersModule } from 'src/auth/users/users.module';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [UsersModule, DatabaseModule],
  providers: [PostsService, PostsRouter],
})
export class PostsModule {}
