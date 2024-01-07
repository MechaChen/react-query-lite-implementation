import React from 'react';

const context = React.createContext();

export function QueryClientProvider({ children, client }) {
    return <context.Provider value={client}>{children}</context.Provider>;
};

export class QueryClient {};

export function useQuery() {
    return {
        status: 'loading',
        isFetching: true,
        data: undefined,
        error: undefined,
    }
};

function createQuery({ queryKey, queryFn }) {
    let query = {
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
                    query.setState((state) => ({
                        ...state,
                        isFetching: true,
                        error: undefined
                    }));
    
                    try {
                        const data = await queryFn();
                        query.setState((state) => ({
                            ...state,
                            status: 'success',
                            data,
                        }));
                    } catch (error) {
                        query.setState((state) => ({
                            ...state,
                            status: 'error',
                            error,
                        }));
                    } finally {
                        query.promise = null;
                        query.setState((state) => ({
                            ...state,
                            isFetching: false,
                        }));
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
