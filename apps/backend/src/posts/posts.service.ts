import { Inject, Injectable } from '@nestjs/common';
import { CreatePostInput, Post } from './schemas/trpc.schema';
import { DATABASE_CONNECTION } from 'src/database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/database/database.module';
import { post } from './schemas/schema';
import { UsersService } from 'src/auth/users/users.service';
import { desc } from 'drizzle-orm';

@Injectable()
export class PostsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly usersService: UsersService,
  ) {}

  async create(createPostInput: CreatePostInput, userId: string) {
    const [newPost] = await this.database
      .insert(post)
      .values({
        userId,
        caption: createPostInput.caption,
        image: createPostInput.image,
        likes: 0,
        createdAt: new Date(),
      })
      .returning();

    return this.formatPostResponse(newPost, userId);
  }

  async findAll(): Promise<Post[]> {
    const posts = await this.database.query.post.findMany({
      with: {
        user: true,
      },
      orderBy: [desc(post.createdAt)],
    });

    return posts.map((savePost) => ({
      id: savePost.id,
      user: {
        username: savePost.user.name,
        avatar: '',
      },
      image: savePost.image,
      caption: savePost.caption,
      likes: savePost.likes,
      timestamp: savePost.createdAt.toISOString(),
      comments: 0,
    }));
  }

  private async formatPostResponse(
    savePost: typeof post.$inferSelect,
    userId: string,
  ): Promise<Post> {
    const userInfo = await this.usersService.findById(userId);

    return {
      id: savePost.id,
      user: {
        username: userInfo.name,
        avatar: '',
      },
      image: savePost.image,
      caption: savePost.caption,
      likes: savePost.likes,
      timestamp: savePost.createdAt.toISOString(),
      comments: 0,
    };
  }
}
