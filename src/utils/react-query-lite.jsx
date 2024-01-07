import React from 'react';

export function QueryClientProvider({ children, client }) {
    return <context.Provider value={client}>{children}</context.Provider>;
};

export class QueryClient {};

export function useQuery() {};

export function ReactQueryDevtools() {
    return null;
};
