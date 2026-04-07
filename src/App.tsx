import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from "react-router";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { isAuthenticated } from "./utils/auth";
import ThemeAlert from "./components/common/ThemeAlert";

const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
const UserProfiles = lazy(() => import("./pages/UserProfiles"));
const UsersAdmin = lazy(() => import("./pages/UsersAdmin"));
const Chat = lazy(() => import("./pages/Chat"));
const TaskAdmin = lazy(() => import("./pages/TaskAdmin"));
const Home = lazy(() => import("./pages/Dashboard/Home"));

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        <span className="h-3 w-3 animate-pulse rounded-full bg-brand-500" />
        Loading workspace...
      </div>
    </div>
  );
}

function RequireAuth() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/" replace />;
}

function PublicOnly() {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

export default function App() {
  return (
    <>
      <Router>
        <ThemeAlert/>
        <ScrollToTop />
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route element={<PublicOnly />}>
              <Route index path="/" element={<SignIn />} />
              <Route path="/signin" element={<Navigate to="/" replace />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Home />} />
                <Route path="/tasks" element={<TaskAdmin />} />
                <Route path="/users" element={<UsersAdmin />} />
                <Route path="/profile" element={<UserProfiles />} />
                <Route path="/chat" element={<Chat />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}
