
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import AddTask from "./pages/AddTask";
import TaskDetails from "./pages/TaskDetails";
import EditTask from "./pages/EditTask";
import EmployeeProfile from "./pages/EmployeeProfile";
import WeeklyReport from "./pages/WeeklyReport";
import MonthlyReport from "./pages/MonthlyReport";

import "./App.css";

// Check saved login session
function isAuthenticated() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");

  if (!token || !user) return false;

  try {
    const parsedUser = JSON.parse(user);
    return Boolean(parsedUser?.id);
  } catch {
    return false;
  }
}

// Protect dashboard and other pages
function ProtectedRoute() {
  return isAuthenticated() ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace />
  );
}

// Redirect logged-in users away from login page
function PublicRoute({ children }) {
  return isAuthenticated() ? (
    <Navigate to="/dashboard" replace />
  ) : (
    children
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/add-task" element={<AddTask />} />
          <Route path="/tasks/:id" element={<TaskDetails />} />
          <Route path="/edit-task/:id" element={<EditTask />} />
          <Route path="/employees/:id" element={<EmployeeProfile />} />
          <Route path="/weekly-report" element={<WeeklyReport />} />
          <Route path="/monthly-report" element={<MonthlyReport />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/dashboard" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
