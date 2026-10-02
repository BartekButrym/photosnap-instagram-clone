import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsRouter } from './comments.router';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [CommentsService, CommentsRouter],
})
export class CommentsModule {}
