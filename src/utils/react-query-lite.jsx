import React, { useContext, useRef, useReducer, useEffect } from 'react';

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

function createQuery(client, { queryKey, queryFn, cacheTime = 5 * 60 * 1000 }) {
    let query = {
        queryKey,
        queryHash: JSON.stringify(queryKey),
        promise: null,
        subscribers: [],
        gcTimeout: null,
        state: {
            status: 'loading',
            isFetching: true,
            data: undefined,
            error: undefined,
            // 避免重複觸發 (deduppling)，如果有 queryFn 正在執行，就不要再執行一次
        },
        subscribe: (subscriber) => {
            query.subscribers.push(subscriber);

            query.unscheduleGC();

            return () => {
                query.subscribers = query.subscribers.filter((s) => s !== subscriber);

                // 當此 query 沒有訂閱者時，就可以 Garbage Collection
                if (!query.subscribers.length) {
                    query.scheduleGC();
                }
            }
        },
        scheduleGC: () => {
            query.gcTimeout = setTimeout(() => {
                client.queries = client.queries.filter((q) => q !== query);
            }, cacheTime);
        },
        unscheduleGC: () => {
            clearTimeout(query.gcTimeout);
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
                        query.setState((state) => ({ ...state, status: 'success', data, lastUpdated: Date.now() }));
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


export function useQuery({ queryKey, queryFn, staleTime, cacheTime }) {
    const client = useContext(context);

    const [, forceRender] = useReducer((state) => state + 1, 0);

    const observerRef = useRef(null);

    if (!observerRef.current) {
        observerRef.current = createQueryObserver(client, {
            queryKey,
            queryFn,
            staleTime,
            cacheTime,
        });
    }

    useEffect(() => {
        return observerRef.current.subscribe(forceRender);
    }, []);

    return observerRef.current.getResult();
};

// 跟 useQuery 結合
function createQueryObserver(client, { queryKey, queryFn, staleTime = 0, cacheTime }) {
    const query = client.getQuery({ queryKey, queryFn, cacheTime });

    const observer = {
        notify: () => {},
        getResult: () => query.state,
        // 在呼叫 useQuery 的時候，就會執行這個函式
        subscribe: (callback) => {
            observer.notify = callback;
            const unsubscribe = query.subscribe(observer);

            // 在呼叫 useQuery 的時候，執行有特定條件的 fetch
            observer.fetch();

            return unsubscribe;
        },
        // fetch 前先檢查保留舊資料的時間 staleTime 是否過期，過期再去 fetch
        fetch: () => {
            if (
                !query.state.lastUpdated
                || Date.now() - query.state.lastUpdated > staleTime
            ) {
                query.fetch();
            }
        }
    }

    return observer;
}

export function ReactQueryDevtools() {
    return null;
};
