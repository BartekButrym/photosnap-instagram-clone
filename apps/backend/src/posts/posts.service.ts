import { Inject, Injectable } from '@nestjs/common';
import { CreatePostInput, Post } from '@repo/trpc/schemas';
import { DATABASE_CONNECTION } from 'src/database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from 'src/database/database.module';
import { post } from './schemas/schema';
import { like } from './schemas/schema';
import { UsersService } from 'src/auth/users/users.service';
import { and, desc, eq } from 'drizzle-orm';

@Injectable()
export class PostsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    private readonly usersService: UsersService,
  ) {}

  async create(createPostInput: CreatePostInput, userId: string) {
    await this.database.insert(post).values({
      userId,
      caption: createPostInput.caption,
      image: createPostInput.image,
      createdAt: new Date(),
    });
  }

  async findAll(userId: string): Promise<Post[]> {
    const posts = await this.database.query.post.findMany({
      with: {
        user: true,
        likes: true,
      },
      orderBy: [desc(post.createdAt)],
    });

    return posts.map((savePost) => ({
      id: savePost.id,
      user: {
        username: savePost.user.name,
        avatar: savePost.user.image || '',
      },
      image: savePost.image,
      likes: savePost.likes.length,
      caption: savePost.caption,
      timestamp: savePost.createdAt.toISOString(),
      comments: 0,
      isLiked: savePost.likes.some((like) => like.userId === userId),
    }));
  }

  async likePost(postId: number, userId: string) {
    const existingLike = await this.database.query.like.findFirst({
      where: and(eq(like.postId, postId), eq(like.userId, userId)),
    });

    if (existingLike) {
      await this.database.delete(like).where(eq(like.id, existingLike.id));
    } else {
      await this.database.insert(like).values({
        postId,
        userId,
      });
    }
  }
}
