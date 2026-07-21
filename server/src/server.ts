import 'reflect-metadata';
import 'dotenv/config';

import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { buildSchema } from 'type-graphql';
import { useServer } from 'graphql-ws/use/ws';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { AppDataSource } from './data-source';
import { pubSub } from './pubsub';
import { SessionResolver } from './resolvers/SessionResolver';
import { QuestionResolver } from './resolvers/QuestionResolver';
import { expressMiddleware } from '@as-integrations/express5';

async function main() {
  // 1. Initialize PostgreSQL connection
  await AppDataSource.initialize();
  console.log('⚡ Database connected successfully');

  // 2. Build TypeGraphQL executable schema
  const schema = await buildSchema({
    resolvers: [SessionResolver, QuestionResolver],
    pubSub,
    validate: true,
  });

  // 3. Create Express app & HTTP Server
  const app = express();
  const httpServer = http.createServer(app);

  // 4. Create WebSocket Server for Subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // 5. Attach WebSocket handler to GraphQL Schema using graphql-ws
  const serverCleanup = useServer({ schema }, wsServer);

  // 6. Create Apollo Server with shutdown plugins
  const server = new ApolloServer({
    schema,
    plugins: [
      // Proper shutdown for HTTP server
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Proper shutdown for WebSocket server
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

  // 7. Apply Express Middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
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
