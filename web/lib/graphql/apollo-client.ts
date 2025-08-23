import { ApolloClient, InMemoryCache, ApolloLink } from '@apollo/client';
import { createHttpLink } from '@apollo/client/link/http';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:3000/graphql',
});

const authLink = setContext((_, { headers }) => {
  // Get the authentication token from local storage if it exists
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  // Return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError((errorResponse) => {
  const { graphQLErrors, networkError } = errorResponse as any;
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }: any) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
        extensions
      );
      
      // Handle specific error codes
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear token and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          // You might want to redirect to login page here
        }
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    
    // Handle network errors
    if ('statusCode' in networkError && networkError.statusCode === 401) {
      // Clear token on 401
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    }
  }
});

const link = ApolloLink.from([errorLink, authLink, httpLink]);

export const apolloClient = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          entities: {
            // Merge incoming entities with existing ones
            merge(_existing = [], incoming: any) {
              return [...incoming];
            },
          },
          entityTypes: {
            merge(_existing = [], incoming: any) {
              return [...incoming];
            },
          },
          relations: {
            merge(_existing = [], incoming: any) {
              return [...incoming];
            },
          },
          relationTypes: {
            merge(_existing = [], incoming: any) {
              return [...incoming];
            },
          },
        },
      },
      Entity: {
        keyFields: ['id'],
      },
      EntityType: {
        keyFields: ['id'],
      },
      Relation: {
        keyFields: ['id'],
      },
      RelationType: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});