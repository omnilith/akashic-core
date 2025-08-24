'use client'

import { ApolloWrapper } from '@/lib/graphql/apollo-wrapper'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ApolloWrapper>{children}</ApolloWrapper>
}