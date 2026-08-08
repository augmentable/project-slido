import 'reflect-metadata';
import 'dotenv/config';

import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { buildSchema } from 'type-graphql';
import { useServer } from 'graphql-ws/use/ws';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import {
  ApolloServerPluginInlineTraceDisabled,
} from '@apollo/server/plugin/disabled';

import { AppDataSource } from './data-source';
import { pubSub } from './pubsub';
import { SessionResolver } from './resolvers/SessionResolver';
import { QuestionResolver } from './resolvers/QuestionResolver';
import { PollResolver, PollOptionResolver } from './resolvers/PollResolver';
import { QuizResolver } from './resolvers/QuizResolver';
import { SurveyResolver } from './resolvers/SurveyResolver';
import { AnalyticsResolver } from './resolvers/AnalyticsResolver';
import { expressMiddleware } from '@as-integrations/express5';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

async function main() {
  await AppDataSource.initialize();
  console.log('⚡ Database connected successfully');

  const schema = await buildSchema({
    resolvers: [
      SessionResolver,
      QuestionResolver,
      PollResolver,
      PollOptionResolver,
      QuizResolver,
      SurveyResolver,
      AnalyticsResolver,
    ],
    pubSub,
    validate: true,
  });

  const app = express();

  app.use(helmet());

  const httpServer = http.createServer(app);

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const server = new ApolloServer({
    schema,
    introspection: !IS_PRODUCTION,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginInlineTraceDisabled(),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  const graphqlLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { errors: [{ message: 'Too many requests, please try again later.' }] },
  });

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({ origin: ALLOWED_ORIGINS, credentials: true }),
    express.json({ limit: '16kb' }),
    graphqlLimiter,
    expressMiddleware(server),
  );

  const PORT = process.env.PORT;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
    console.log(`📡 Subscriptions ready at ws://localhost:${PORT}/graphql`);
  });
}

main().catch((err) => {
  console.error('Error starting server:', err);
});
