import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard, AuthModule } from '@thallesp/nestjs-better-auth';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { DATABASE_CONNECTION } from './database/database-connection';
import { PostsModule } from './posts/posts.module';
import { TRPCModule } from 'nestjs-trpc-v2';
import { UsersModule } from './auth/users/users.module';
import { UploadModule } from './upload/upload.module';
import { AppContext } from './app.context';
import { AuthTrpcMiddleware } from './auth/auth-trpc.middleware';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    TRPCModule.forRoot({
      autoSchemaFile: '../../packages/trpc/src/server',
      context: AppContext,
      basePath: '/api/trpc',
    }),
    AuthModule.forRootAsync({
      imports: [DatabaseModule, ConfigModule],
      useFactory: (database: NodePgDatabase, configService: ConfigService) => ({
        auth: betterAuth({
          database: drizzleAdapter(database, {
            provider: 'pg',
          }),
          emailAndPassword: { enabled: true },
          trustedOrigins: [configService.getOrThrow('UI_URL')],
        }),
      }),
      inject: [DATABASE_CONNECTION, ConfigService],
    }),
    PostsModule,
    UsersModule,
    UploadModule,
  ],
  controllers: [],
  providers: [
    AuthTrpcMiddleware,
    AppContext,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
