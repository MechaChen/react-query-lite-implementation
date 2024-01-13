import React from 'react';

const context = React.createContext();

export function QueryClientProvider({ children, client }) {
    return <context.Provider value={client}>{children}</context.Provider>;
};

// 需要一個地放 queries，這時候就需要 QueryClient
export class QueryClient {
    constructor() {
        this.queries = [];
    }

    // 取得特定的 query
    getQuery = (options) => {
        // 1. 利用 queryKey 找到對應的 query
        const queryHash = JSON.stringify(options.queryKey);
        let query = this.queries.find((query) => query.queryHash === queryHash);

        // 2. 如果沒有，就建立一個新的 query
        if (!query) {
            query = createQuery(this, options);
            this.queries.push(query);
        }

        return query;
    }
};

export function useQuery() {
    return {
        status: 'loading',
        isFetching: true,
        data: undefined,
        error: undefined,
    }
};

function createQuery(client, { queryKey, queryFn }) {
    let query = {
        queryKey,
        queryHash: JSON.stringify(queryKey),
        promise: null,
        subscribers: [],
        state: {
            status: 'loading',
            isFetching: true,
            data: undefined,
            error: undefined,
            // 避免重複觸發 (deduppling)，如果有 queryFn 正在執行，就不要再執行一次
        },
        subscribe: (subscriber) => {
            query.subscribers.push(subscriber);
            
            return () => {
                query.subscribers = query.subscribers.filter((s) => s !== subscriber);
            }
        },
        setState: (updater) => {
            // updater 類似 reducer，用來改變 state
            query.state = updater(query.state);
            query.subscribers.forEach((subscriber) => subscriber.notify());
        },
        fetch: () => {
            if (!query.promise) {
                query.promise = (async () => {
                    query.setState((state) => ({ ...state, isFetching: true, error: undefined }));
    
                    try {
                        const data = await queryFn();
                        query.setState((state) => ({ ...state, status: 'success', data }));
                    } catch (error) {
                        query.setState((state) => ({ ...state, status: 'error', error }));
                    } finally {
                        query.promise = null;
                        query.setState((state) => ({ ...state, isFetching: false }));
                    }
                })()
            }

            return query.promise;
        },
    }

    return query;
}

export function ReactQueryDevtools() {
    return null;
};
