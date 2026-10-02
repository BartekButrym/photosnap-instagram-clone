import {
  CreateStoryInput,
  createStorySchema,
  storyGroupSchema,
} from '@repo/trpc/schemas';
import {
  Ctx,
  Input,
  Mutation,
  Query,
  Router,
  UseMiddlewares,
} from 'nestjs-trpc-v2';
import { AuthTrpcMiddleware } from 'src/auth/auth-trpc.middleware';
import { StoriesService } from './stories.service';
import { AppContext } from 'src/app.context.interface';
import z from 'zod';

@Router()
@UseMiddlewares(AuthTrpcMiddleware)
export class StoriesRouter {
  constructor(private readonly storiesService: StoriesService) {}

  @Mutation({ input: createStorySchema })
  async create(
    @Input() createStoryInput: CreateStoryInput,
    @Ctx() context: AppContext,
  ) {
    return await this.storiesService.create(createStoryInput, context.user.id);
  }

  @Query({ output: z.array(storyGroupSchema) })
  async getStories(@Ctx() context: AppContext) {
    return await this.storiesService.getStories(context.user.id);
  }
}
