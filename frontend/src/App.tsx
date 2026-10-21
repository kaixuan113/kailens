import { Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { AdminPage } from './pages/AdminPage';
import { AiPage } from './pages/AiPage';
import { BlogPage } from './pages/BlogPage';
import { HomePage } from './pages/HomePage';
import { PostPage } from './pages/PostPage';

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<PostPage />} />
        <Route path="/ai" element={<AiPage />} />
      </Route>
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
