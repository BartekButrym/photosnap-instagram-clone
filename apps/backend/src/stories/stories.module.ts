import { Module } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { StoriesRouter } from './stories.router';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [StoriesService, StoriesRouter],
})
export class StoriesModule {}
