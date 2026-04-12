import {
  Ctx,
  Input,
  Mutation,
  Query,
  Router,
  UseMiddlewares,
} from 'nestjs-trpc-v2';
import {
  CreatePostInput,
  createPostSchema,
  LikePostInput,
  likePostSchema,
  postSchema,
} from '@repo/trpc/schemas';
import { PostsService } from './posts.service';
import z from 'zod';
import { AuthTrpcMiddleware } from 'src/auth/auth-trpc.middleware';
import { AppContext } from 'src/app.context.interface';

@Router()
@UseMiddlewares(AuthTrpcMiddleware)
export class PostsRouter {
  constructor(private readonly postsService: PostsService) {}

  @Mutation({ input: createPostSchema })
  async create(
    @Input() createPostInput: CreatePostInput,
    @Ctx() context: AppContext,
  ) {
    return this.postsService.create(createPostInput, context.user.id);
  }

  @Query({ output: z.array(postSchema) })
  async findAll(@Ctx() context: AppContext) {
    return this.postsService.findAll(context.user.id);
  }

  @Mutation({ input: likePostSchema })
  async likePost(
    @Input() likePostInput: LikePostInput,
    @Ctx() context: AppContext,
  ) {
    return await this.postsService.likePost(
      likePostInput.postId,
      context.user.id,
    );
  }
}
