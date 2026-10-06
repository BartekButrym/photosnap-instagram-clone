import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DATABASE_CONNECTION } from './database-connection';
import * as authSchema from '../auth/schema';
import * as postsSchema from '../posts/schemas/schema';
import * as commentSchema from '../comments/schemas/schema';
import * as storiesSchema from '../stories/schemas/schema';
import path from 'path';
import fs from 'fs';

export const schema = {
  ...authSchema,
  ...postsSchema,
  ...commentSchema,
  ...storiesSchema,
};

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        let ssl: { ca: string } | boolean = false;

        if (configService.get('NODE_ENV') === 'production') {
          const certPath = path.resolve(__dirname, '../../global-bundle.pem');
          const certificate = fs.readFileSync(certPath).toString();

          ssl = { ca: certificate };
        }

        const pool = new Pool({
          host: configService.getOrThrow('DATABASE_HOST'),
          port: configService.getOrThrow('PORT'),
          user: configService.getOrThrow('DATABASE_USER'),
          password: configService.getOrThrow('DATABASE_PASSWORD'),
          database: configService.getOrThrow('DATABASE_NAME'),
          ssl: ssl,
        });

        return drizzle(pool, {
          schema: schema,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
