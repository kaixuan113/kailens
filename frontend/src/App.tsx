import { Link, Route, Routes } from "react-router-dom";
import { SiteLayout } from "./components/SiteLayout";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { WorkPage } from "./pages/WorkPage";
export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/works/:id" element={<WorkPage />} />
        <Route
          path="*"
          element={
            <div className="empty-state">
              <p>这一页已归档，新的故事在影像里。</p>
              <Link to="/">返回摄影作品</Link>
            </div>
          }
        />
      </Route>
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}
