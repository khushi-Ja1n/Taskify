import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

import "./EmployeeProfile.css";

function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchEmployeeTasks();
  }, [id]);

  const fetchEmployeeTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // Employee name/profile
      const userResponse = await api.get(
        `/api/users/${id}`,
        config
      );

      setUser(userResponse.data.user);

      // Only employee's tasks
      const taskResponse = await api.get(
        `/api/tasks/employee/${id}`,
        config
      );

      setTasks(taskResponse.data.tasks || []);

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "Failed to load employee tasks"
      );
    } finally {
      setLoading(false);
    }
  };


  const getStatusClass = (status) => {
    const value = String(status || "").toLowerCase();

    if (value === "completed") {
      return "status completed";
    }

    if (value === "in progress") {
      return "status progress";
    }

    return "status pending";
  };


  if (loading) {
    return (
      <div className="employee-profile-page">
        <p>Loading tasks...</p>
      </div>
    );
  }


  if (error) {
    return (
      <div className="employee-profile-page">

        <button
          className="back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>

        <div className="error-box">
          {error}
        </div>

      </div>
    );
  }


  return (
    <div className="employee-profile-page">

      {/* Back */}

      <button
        className="back-btn"
        onClick={() => navigate("/dashboard")}
      >
        ← Back to Dashboard
      </button>


      {/* Employee Header */}

      <div className="employee-task-header">

        <div className="employee-avatar">

          {user?.name
            ? user.name.charAt(0).toUpperCase()
            : "U"}

        </div>


        <div>

          <h1>
            {user?.name || "Employee"}'s Tasks
          </h1>

          <p>
            View all tasks of this employee
          </p>

        </div>

      </div>


      {/* Task Summary */}

      <div className="task-summary">

        <div className="summary-card">

          <span>All Tasks</span>

          <strong>
            {tasks.length}
          </strong>

        </div>


        <div className="summary-card">

          <span>Pending</span>

          <strong>
            {
              tasks.filter(
                (task) =>
                  String(task.status).toLowerCase() ===
                  "pending"
              ).length
            }
          </strong>

        </div>


        <div className="summary-card">

          <span>In Progress</span>

          <strong>
            {
              tasks.filter(
                (task) =>
                  String(task.status).toLowerCase() ===
                  "in progress"
              ).length
            }
          </strong>

        </div>


        <div className="summary-card">

          <span>Completed</span>

          <strong>
            {
              tasks.filter(
                (task) =>
                  String(task.status).toLowerCase() ===
                  "completed"
              ).length
            }
          </strong>

        </div>

      </div>


      {/* Tasks */}

      <div className="employee-tasks">

        <div className="tasks-heading">

          <div>

            <h2>
              {user?.name || "Employee"}'s Tasks
            </h2>

            <p>
              All tasks assigned to this employee
            </p>

          </div>

          <div className="task-count">
            {tasks.length} Tasks
          </div>

        </div>


        {/* No Tasks */}

        {tasks.length === 0 ? (

          <div className="empty-box">

            <div className="empty-icon">
              📋
            </div>

            <h3>
              No tasks found
            </h3>

            <p>
              This employee has no tasks yet.
            </p>

          </div>

        ) : (

          <div className="employee-task-table">

            <table>

              <thead>

                <tr>

                  <th>Task</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Start Date</th>
                  <th>Due Date</th>

                </tr>

              </thead>


              <tbody>

                {tasks.map((task) => (

                  <tr key={task.id}>

                    {/* Task */}

                    <td>

                      <strong>
                        {task.title}
                      </strong>

                      <p>
                        {task.description ||
                          "No description"}
                      </p>

                    </td>


                    {/* Priority */}

                    <td>

                      <span
                        className={`priority ${
                          task.priority || "medium"
                        }`}
                      >
                        {task.priority || "medium"}
                      </span>

                    </td>


                    {/* Status */}

                    <td>

                      <span
                        className={getStatusClass(
                          task.status
                        )}
                      >
                        {task.status || "pending"}
                      </span>

                    </td>


                    {/* Progress */}

                    <td>

                      <div className="profile-progress">

                        <div className="profile-progress-bar">

                          <div
                            className="profile-progress-fill"
                            style={{
                              width: `${
                                task.progress || 0
                              }%`,
                            }}
                          />

                        </div>

                        <span>
                          {task.progress || 0}%
                        </span>

                      </div>

                    </td>


                    {/* Start Date */}

                    <td>

                      {task.start_date
                        ? new Date(
                            task.start_date
                          ).toLocaleDateString()
                        : "-"}

                    </td>


                    {/* Due Date */}

                    <td>

                      {task.due_date
                        ? new Date(
                            task.due_date
                          ).toLocaleDateString()
                        : "-"}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default EmployeeProfile;