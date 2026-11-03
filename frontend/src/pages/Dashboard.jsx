
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ClipboardList,
  Clock3,
  CircleCheck,
  Plus,
  CalendarDays,
  ChartNoAxesColumn,
  ArrowRight,
  LogOut,
  ShieldCheck,
  X,
  Trash2,
  RefreshCw,
  UserRound,
  AlertCircle,
} from "lucide-react";
import api from "../services/api";
import "./Dashboard.css";

const EMPTY_ACCOUNT = {
  name: "",
  email: "",
  password: "",
  designation: "",
  department_id: "",
  role: "employee",
};

const normalizeStatus = (value) =>
  String(value || "pending")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Dashboard() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [userError, setUserError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountForm, setAccountForm] = useState(EMPTY_ACCOUNT);

  const [deletingUserId, setDeletingUserId] = useState(null);

  const [loggedUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const role = String(loggedUser.role || "employee").toLowerCase();
  const isAdmin = role === "admin";

  const authConfig = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }, []);

  const handleUnauthorized = useCallback(
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return true;
      }
      return false;
    },
    [navigate]
  );

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUserError("");

    try {
      const response = await api.get("/api/users", authConfig());
      setUsers(Array.isArray(response.data.users) ? response.data.users : []);
    } catch (error) {
      if (!handleUnauthorized(error)) {
        console.error("Error loading users:", error);
        setUserError(
          error.response?.data?.message || "Failed to load employees."
        );
      }
    } finally {
      setLoadingUsers(false);
    }
  }, [authConfig, handleUnauthorized]);

  const fetchTasks = useCallback(async () => {
    setLoadingTasks(true);
    setTaskError("");

    try {
      const response = await api.get("/api/tasks", authConfig());
      setTasks(Array.isArray(response.data.tasks) ? response.data.tasks : []);
    } catch (error) {
      if (!handleUnauthorized(error)) {
        console.error("Error loading tasks:", error);
        setTaskError(
          error.response?.data?.message || "Failed to load tasks."
        );
      }
    } finally {
      setLoadingTasks(false);
    }
  }, [authConfig, handleUnauthorized]);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(), fetchTasks()]);
    setRefreshing(false);
  }, [fetchUsers, fetchTasks]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/login");
      return;
    }

    fetchUsers();
    fetchTasks();
  }, [navigate, fetchUsers, fetchTasks]);

  const taskStats = useMemo(() => {
    const stats = {
      total: tasks.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
    };

    tasks.forEach((task) => {
      const status = normalizeStatus(task.status);

      if (status === "pending") {
        stats.pending += 1;
      } else if (
        status === "in_progress" ||
        status === "inprogress"
      ) {
        stats.inProgress += 1;
      } else if (status === "completed") {
        stats.completed += 1;
      }
    });

    return stats;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (selectedFilter === "" || selectedFilter === "all") {
      return tasks;
    }

    return tasks.filter((task) => {
      const status = normalizeStatus(task.status);

      if (selectedFilter === "in_progress") {
        return status === "in_progress" || status === "inprogress";
      }

      return status === selectedFilter;
    });
  }, [tasks, selectedFilter]);

  const openAccountModal = () => {
    setAccountForm(EMPTY_ACCOUNT);
    setAccountMessage("");
    setAccountError("");
    setShowCreateAccount(true);
  };

  const closeAccountModal = () => {
    if (creatingAccount) return;
    setShowCreateAccount(false);
    setAccountMessage("");
    setAccountError("");
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setAccountMessage("");
    setAccountError("");

    if (!isAdmin) {
      setAccountError("Only an administrator can create accounts.");
      return;
    }

    try {
      setCreatingAccount(true);

      const payload = {
        ...accountForm,
        name: accountForm.name.trim(),
        email: accountForm.email.trim(),
        designation: accountForm.designation.trim(),
        department_id: accountForm.department_id
          ? Number(accountForm.department_id)
          : null,
        role: accountForm.role,
      };

      await api.post("/api/auth/register", payload, authConfig());

      setAccountMessage("Account created successfully.");
      setAccountForm(EMPTY_ACCOUNT);
      await fetchUsers();
    } catch (error) {
      if (!handleUnauthorized(error)) {
        setAccountError(
          error.response?.data?.message ||
            "Could not create the account. Check the details and try again."
        );
      }
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleDeleteAccount = async (user) => {
    if (!isAdmin || deletingUserId !== null) return;

    if (Number(user.id) === Number(loggedUser.id)) {
      window.alert("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name || "this user"}?`
    );

    if (!confirmed) return;

    try {
      setDeletingUserId(user.id);

      await api.delete(`/api/users/${user.id}`, authConfig());

      setUsers((previous) =>
        previous.filter((item) => String(item.id) !== String(user.id))
      );

      window.alert("Account deleted successfully.");
    } catch (error) {
      if (!handleUnauthorized(error)) {
        window.alert(
          error.response?.data?.message || "Failed to delete the account."
        );
      }
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const filterTitle = {
    all: "All Tasks",
    pending: "Pending Tasks",
    in_progress: "In-Progress Tasks",
    completed: "Completed Tasks",
  };

  const statCards = [
    {
      title: "Total Employees",
      value: users.length,
      icon: Users,
      color: "blue",
      filter: null,
    },
    {
      title: "All Tasks",
      value: taskStats.total,
      icon: ClipboardList,
      color: "purple",
      filter: "all",
    },
    {
      title: "Pending Tasks",
      value: taskStats.pending,
      icon: Clock3,
      color: "orange",
      filter: "pending",
    },
    {
      title: "Completed Tasks",
      value: taskStats.completed,
      icon: CircleCheck,
      color: "green",
      filter: "completed",
    },
  ];

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-heading">
          <h1>Dashboard</h1>
          <p>Track team activity, tasks, and work reports in one place.</p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-action-btn"
            onClick={refreshDashboard}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            title="Refresh dashboard"
          >
            <RefreshCw size={17} className={refreshing ? "spin-icon" : ""} />
          </button>

          <div className="user-profile">
            <div className="user-avatar">
              {(loggedUser.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <strong>{loggedUser.name || "User"}</strong>
              <span>
                <ShieldCheck size={13} />
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="logout-btn header-logout"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <section className="welcome-banner">
        <div className="welcome-content">
          <span className="welcome-label">YOUR WORKSPACE</span>
          <h2>Welcome back, {loggedUser.name || "User"}</h2>
          <p>
            {isAdmin
              ? "Manage accounts, monitor tasks, and review company reports."
              : role === "manager"
                ? "Monitor your work and stay up to date with team activity."
                : "Keep your tasks organized and make progress every day."}
          </p>
        </div>
        <div className="welcome-icon">
          <ClipboardList size={42} strokeWidth={1.6} />
        </div>
      </section>

      <section className="stats-grid" aria-label="Dashboard statistics">
        {statCards.map(({ title, value, icon: Icon, color, filter }) => (
          <button
            type="button"
            key={title}
            className={[
              "stat-card",
              `stat-${color}`,
              filter && selectedFilter === filter ? "active" : "",
              filter ? "stat-card-clickable" : "",
            ].join(" ")}
            onClick={() => filter && setSelectedFilter(filter)}
            disabled={!filter}
            aria-pressed={filter ? selectedFilter === filter : undefined}
          >
            <span className="stat-icon">
              <Icon size={23} strokeWidth={1.9} />
            </span>
            <span className="stat-copy">
              <span className="stat-title">{title}</span>
              <strong className="stat-number">{value}</strong>
            </span>
            {filter && <ArrowRight className="stat-arrow" size={17} />}
          </button>
        ))}
      </section>

      {selectedFilter !== "" && (
        <section className="filtered-tasks-section">
          <div className="task-filter-heading">
            <div>
              <span className="eyebrow">TASK OVERVIEW</span>
              <h2>{filterTitle[selectedFilter] || "Tasks"}</h2>
            </div>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setSelectedFilter("")}
            >
              Clear filter
              <X size={15} />
            </button>
          </div>

          {loadingTasks ? (
            <div className="loading-box">Loading tasks...</div>
          ) : taskError ? (
            <div className="error-box">
              <AlertCircle size={18} />
              {taskError}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="empty-box">
              <ClipboardList size={30} />
              <h3>No tasks found</h3>
              <p>There are no tasks in this category right now.</p>
            </div>
          ) : (
            <div className="filtered-task-list">
              {filteredTasks.map((task) => (
                <article className="filtered-task-card" key={task.id}>
                  <div className="filtered-task-main">
                    <h3>{task.title || "Untitled task"}</h3>
                    <p>{task.description || "No description provided."}</p>
                  </div>
                  <div className="filtered-task-meta">
                    <span className={`status-badge status-${normalizeStatus(task.status)}`}>
                      {String(task.status || "Pending").replace(/_/g, " ")}
                    </span>
                    <span>Priority: {task.priority || "Normal"}</span>
                    <span>Due: {formatDate(task.due_date || task.end_date)}</span>
                  </div>
                  <button
                    type="button"
                    className="text-action-btn"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    View task <ArrowRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="employees-section">
        <div className="section-header">
          <div>
            <span className="eyebrow">PEOPLE</span>
            <h2>Company Members</h2>
            <p>View registered team members and their account roles.</p>
          </div>

          {isAdmin && (
            <button
              type="button"
              className="create-account-btn"
              onClick={openAccountModal}
            >
              <Plus size={18} />
              Create Account
            </button>
          )}
        </div>

        {showCreateAccount && isAdmin && (
          <div
            className="account-modal-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeAccountModal();
            }}
          >
            <div
              className="account-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-account-title"
            >
              <div className="account-modal-header">
                <div className="modal-title-icon">
                  <UserRound size={22} />
                </div>
                <div className="modal-heading-copy">
                  <h2 id="create-account-title">Create New Account</h2>
                  <p>Add an employee or manager to the portal.</p>
                </div>
                <button
                  type="button"
                  className="account-close-btn"
                  onClick={closeAccountModal}
                  aria-label="Close form"
                  disabled={creatingAccount}
                >
                  <X size={19} />
                </button>
              </div>

              {accountMessage && (
                <div className="account-success" role="status">
                  <CircleCheck size={17} />
                  {accountMessage}
                </div>
              )}
              {accountError && (
                <div className="account-error" role="alert">
                  <AlertCircle size={17} />
                  {accountError}
                </div>
              )}

              <form className="account-form" onSubmit={handleCreateAccount}>
                <div className="form-field">
                  <label htmlFor="account-name">Full name *</label>
                  <input
                    id="account-name"
                    type="text"
                    autoComplete="name"
                    value={accountForm.name}
                    onChange={(event) =>
                      setAccountForm({
                        ...accountForm,
                        name: event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="account-email">Email address *</label>
                  <input
                    id="account-email"
                    type="email"
                    autoComplete="email"
                    value={accountForm.email}
                    onChange={(event) =>
                      setAccountForm({
                        ...accountForm,
                        email: event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="account-password">Temporary password *</label>
                  <input
                    id="account-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={accountForm.password}
                    onChange={(event) =>
                      setAccountForm({
                        ...accountForm,
                        password: event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="account-designation">Designation</label>
                  <input
                    id="account-designation"
                    type="text"
                    value={accountForm.designation}
                    onChange={(event) =>
                      setAccountForm({
                        ...accountForm,
                        designation: event.target.value,
                      })
                    }
                    placeholder="e.g. Software Developer"
                  />
                </div>

                

                <div className="form-field">
                  <label htmlFor="account-role">Account role *</label>
                  <select
                    id="account-role"
                    value={accountForm.role}
                    onChange={(event) =>
                      setAccountForm({
                        ...accountForm,
                        role: event.target.value,
                      })
                    }
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div className="account-form-actions">
                  <button
                    type="button"
                    className="account-cancel-btn"
                    onClick={closeAccountModal}
                    disabled={creatingAccount}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="create-account-btn"
                    disabled={creatingAccount}
                  >
                    {creatingAccount ? "Creating..." : "Create Account"}
                    {!creatingAccount && <ArrowRight size={16} />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loadingUsers ? (
          <div className="loading-box">Loading company members...</div>
        ) : userError ? (
          <div className="error-box">
            <AlertCircle size={18} />
            <span>{userError}</span>
            <button type="button" onClick={fetchUsers} className="secondary-btn">
              Try again
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-box">
            <Users size={32} />
            <h3>No company members found</h3>
            <p>Registered employees and managers will appear here.</p>
          </div>
        ) : (
          <div className="employees-grid">
            {users.map((user) => (
              <article className="employee-card" key={user.id}>
                <div className="employee-card-top">
                  <div className="employee-avatar">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`role-badge role-${String(
                      user.role || "employee"
                    ).toLowerCase()}`}
                  >
                    {user.role || "Employee"}
                  </span>
                </div>

                <div className="employee-info">
                  <h3>{user.name || "Unnamed user"}</h3>
                  <p>{user.designation || "Team member"}</p>
                  <span className="employee-email">{user.email || "No email"}</span>
                </div>

                <div className="employee-card-actions">
                  <button
                    type="button"
                    className="view-employee-btn"
                    onClick={() => navigate(`/employees/${user.id}`)}
                  >
                    View profile <ArrowRight size={15} />
                  </button>

                  {isAdmin &&
                    String(user.role || "").toLowerCase() !== "admin" && (
                      <button
                        type="button"
                        className="delete-account-btn"
                        onClick={() => handleDeleteAccount(user)}
                        disabled={deletingUserId !== null}
                        aria-label={`Delete ${user.name || "user"} account`}
                        title="Delete account"
                      >
                        <Trash2 size={16} />
                        {String(deletingUserId) === String(user.id)
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="recent-tasks">
        <div className="recent-header">
          <div>
                        <h2>Task Management & Reports</h2>
            <p>Open tasks, create work items, or review your reports.</p>
          </div>
          </div>

        <div className="task-management-cards">
          <article className="management-card">
            <div className="management-icon management-blue">
              <ClipboardList size={24} />
            </div>
            <h3>All Tasks</h3>
            <p>Browse and track tasks available to your account.</p>
            <button type="button" onClick={() => navigate("/tasks")}>
              View tasks <ArrowRight size={16} />
            </button>
          </article>

          <article className="management-card">
            <div className="management-icon management-purple">
              <Plus size={24} />
            </div>
            <h3>Create Task</h3>
            <p>Create a new task and record your work.</p>
            <button type="button" onClick={() => navigate("/add-task")}>
              Add task <ArrowRight size={16} />
            </button>
          </article>

          <article className="management-card">
            <div className="management-icon management-orange">
              <ChartNoAxesColumn size={24} />
            </div>
            <h3>Weekly Report</h3>
            <p>Review the Monday-to-Saturday work cycle.</p>
            <button type="button" onClick={() => navigate("/weekly-report")}>
              View report <ArrowRight size={16} />
            </button>
          </article>

          <article className="management-card">
            <div className="management-icon management-green">
              <CalendarDays size={24} />
            </div>
            <h3>Monthly Report</h3>
            <p>Review monthly work and available report exports.</p>
            <button type="button" onClick={() => navigate("/monthly-report")}>
              View report <ArrowRight size={16} />
            </button>
          </article>
        </div>
      </section>

      <footer className="dashboard-footer">
        <span>Employee Task Portal</span>
        <span>Signed in as {loggedUser.name || "User"}</span>
        </footer>
    </main>
  );
}

export default Dashboard;
