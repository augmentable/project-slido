'use client';

import { apolloClient } from '../lib/apollo-client';
import { ApolloProvider } from '@apollo/client/react';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}
