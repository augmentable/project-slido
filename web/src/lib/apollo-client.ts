import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  ApolloLink,
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// 1. HTTP Link for Queries and Mutations
const httpLink = new HttpLink({
  uri: 'http://localhost:8080/graphql',
});

// 2. WebSocket Link for Real-time Subscriptions (Client-side only)
const wsLink =
  typeof window !== 'undefined'
    ? new GraphQLWsLink(
        createClient({
          url: 'ws://localhost:8080/graphql',
        }),
      )
    : null;

// 3. Split routing based on operation type
const splitLink =
  typeof window !== 'undefined' && wsLink
    ? ApolloLink.split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
          );
        },
        wsLink,
        httpLink,
      )
    : httpLink;

// 4. Create Apollo Client Instance
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
