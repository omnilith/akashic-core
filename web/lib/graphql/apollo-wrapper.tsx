"use client";

import { ApolloLink, HttpLink } from "@apollo/client";
import {
  ApolloNextAppProvider,
  ApolloClient,
  InMemoryCache,
  SSRMultipartLink,
} from "@apollo/experimental-nextjs-app-support";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";

function makeClient() {
  const httpLink = new HttpLink({
    uri:
      process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
      "http://localhost:3000/graphql",
    fetchOptions: { cache: "no-store" },
  });

  const authLink = setContext((_, { headers }) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
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

        if (extensions?.code === "UNAUTHENTICATED") {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
          }
        }
      });
    }

    if (networkError) {
      console.error(`[Network error]: ${networkError}`);

      if ("statusCode" in networkError && networkError.statusCode === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
      }
    }
  });

  const link =
    typeof window === "undefined"
      ? ApolloLink.from([
          new SSRMultipartLink({
            stripDefer: true,
          }),
          errorLink,
          authLink,
          httpLink,
        ])
      : ApolloLink.from([errorLink, authLink, httpLink]);

  return new ApolloClient({
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            entities: {
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
          keyFields: ["id"],
        },
        EntityType: {
          keyFields: ["id"],
        },
        Relation: {
          keyFields: ["id"],
        },
        RelationType: {
          keyFields: ["id"],
        },
      },
    }),
    link,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
        errorPolicy: "all",
      },
      query: {
        fetchPolicy: "cache-first",
        errorPolicy: "all",
      },
      mutate: {
        errorPolicy: "all",
      },
    },
  });
}

export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider makeClient={makeClient}>
      {children}
    </ApolloNextAppProvider>
  );
}
