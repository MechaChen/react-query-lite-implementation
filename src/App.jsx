import { useState } from 'react';
import axios from 'axios';
// import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
// import { ReactQueryDevtools } from 'react-query/devtools';


import {
    QueryClient,
    QueryClientProvider,
    useQuery,
    ReactQueryDevtools,
  } from './utils/react-query-lite';

import './App.css';

const queryClient = new QueryClient();

// Our App and 'router'

function App() {
  const [postId, setPostId] = useState(-1);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        {
          postId > -1 ? (
            <Post postId={postId} setPostId={setPostId} />
            ) : (
            <Posts setPostId={setPostId} />
          )
        }
      </div>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

// Our custom query hooks
function usePosts() {
  return useQuery({
    queryKey: 'posts',
    queryFn: async () => {
      await sleep(1000);
      const { data } = await axios.get(`https://jsonplaceholder.typicode.com/posts`);
      return data.slice(0, 5);
    },
  });
}

function usePost(postId) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      await sleep(1000);
      const { data } = await axios.get(`https://jsonplaceholder.typicode.com/posts/${postId}`);
      return data;
    },
  });
}


// Our components

function Posts({ setPostId }) {
  const postQuery = usePosts();

  return (
    <div>
      <h1>Posts</h1>
      {postQuery.status === 'loading'
        ? <div>Loading...</div>
        : postQuery.status === 'error'
          ? <span>Error: {postQuery.error.message}</span>
          : (
            <>
              <ul className="posts__list">
                {postQuery.data.map(post => (
                  <li
                    key={post.id}
                    onClick={() => setPostId(post.id)}
                    className="posts__item"
                  >
                    {post.title}
                  </li>
                ))}
              </ul>
              <div>
                {postQuery.isFetching ? 'Updating in background...' : ' '}
              </div>
            </>
          )
      }
    </div>
  );
}


function Post({ postId, setPostId }) {
  const postQuery = usePost(postId);

  return (
    <div>
      <div>
        <div className="post__back" onClick={() => setPostId(-1)}>⬅️ Back</div>
      </div>
      <div>
        {!postId || postQuery.status === 'loading'
          ? <div>Loading...</div>
          : postQuery.status === 'error'
            ? <span>Error: {postQuery.error.message}</span>
            : (
              <>
                <h1>{postQuery.data.title}</h1>
                <p>{postQuery.data.body}</p>
                <div>
                  {postQuery.isFetching ? 'Updating in background...' : ' '}
                </div>
              </>
            )
        }
      </div>
    </div>
  );
}


// Utilities

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


export default App;
