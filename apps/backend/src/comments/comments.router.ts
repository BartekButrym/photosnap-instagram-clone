import {
  Ctx,
  Input,
  Mutation,
  Query,
  Router,
  UseMiddlewares,
} from 'nestjs-trpc-v2';
import { AuthTrpcMiddleware } from 'src/auth/auth-trpc.middleware';
import { CommentsService } from './comments.service';
import {
  commentSchema,
  CreateCommentInput,
  createCommentSchema,
  DeleteCommentInput,
  deleteCommentSchema,
  GetCommentInput,
  getCommentsSchema,
} from '@repo/trpc/schemas';
import { AppContext } from 'src/app.context.interface';
import z from 'zod';

@Router()
@UseMiddlewares(AuthTrpcMiddleware)
export class CommentsRouter {
  constructor(private readonly commentsService: CommentsService) {}

  @Mutation({ input: createCommentSchema })
  async create(
    @Input() createCommentInput: CreateCommentInput,
    @Ctx() context: AppContext,
  ) {
    return await this.commentsService.create(
      createCommentInput,
      context.user.id,
    );
  }

  @Query({ input: getCommentsSchema, output: z.array(commentSchema) })
  async findByPostId(@Input() getCommentsInput: GetCommentInput) {
    return await this.commentsService.findByPostId(getCommentsInput.postId);
  }

  @Mutation({ input: deleteCommentSchema })
  async delete(
    @Input() deleteCommentInput: DeleteCommentInput,
    @Ctx() context: AppContext,
  ) {
    return await this.commentsService.delete(
      deleteCommentInput.commentId,
      context.user.id,
    );
  }
}
