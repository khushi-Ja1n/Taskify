
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AddTask.css";

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekDays() {
  const today = new Date();
  const day = today.getDay();

  const monday = new Date(today);
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(today.getDate() + diff);

  const days = [];

  for (let i = 0; i < 6; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    days.push({
      name: date.toLocaleDateString("en-US", {
        weekday: "long",
      }),
      date: formatLocalDate(date),
      savedTasks: [],
      newTasks: [""],
    });
  }

  return days;
}

function AddTask() {
  const navigate = useNavigate();

  const [days, setDays] = useState(getWeekDays());
  const [priority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // LOAD PREVIOUSLY SAVED TASKS
  useEffect(() => {
    const fetchPreviousTasks = async () => {
      try {
        const user = JSON.parse(
          localStorage.getItem("user") || "{}"
        );

        if (!user?.id) {
          throw new Error("Please login again.");
        }

        const response = await api.get("/api/tasks");

        const allTasks = Array.isArray(response.data.tasks)
          ? response.data.tasks
          : Array.isArray(response.data)
          ? response.data
          : [];

        setDays((previousDays) =>
          previousDays.map((day) => {
            const savedTasks = allTasks.filter((task) => {
              const taskDate = task.start_date
                ? String(task.start_date).slice(0, 10)
                : "";

              const assignedUser =
                task.assigned_to?.id ??
                task.assigned_to ??
                task.assigned_to_id;

              return (
                taskDate === day.date &&
                String(assignedUser) === String(user.id)
              );
            });

            return {
              ...day,
              savedTasks,
            };
          })
        );
      } catch (err) {
        console.error("Previous tasks error:", err);

        setError(
          err.response?.data?.message ||
          err.message ||
          "Unable to load previous tasks."
        );
      } finally {
        setFetching(false);
      }
    };

    fetchPreviousTasks();
  }, []);

  // CHANGE NEW TASK
  const handleTaskChange = (dayIndex, taskIndex, value) => {
    setDays((previousDays) =>
      previousDays.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              newTasks: day.newTasks.map((task, i) =>
                i === taskIndex ? value : task
              ),
            }
          : day
      )
    );
  };

  // ADD ANOTHER TASK
  const addTask = (dayIndex) => {
    setDays((previousDays) =>
      previousDays.map((day, index) =>
        index === dayIndex
          ? {
              ...day,
              newTasks: [...day.newTasks, ""],
            }
          : day
      )
    );
  };

  // REMOVE NEW TASK
  const removeTask = (dayIndex, taskIndex) => {
    setDays((previousDays) =>
      previousDays.map((day, index) => {
        if (index !== dayIndex) return day;

        const updatedTasks = day.newTasks.filter(
          (_, i) => i !== taskIndex
        );

        return {
          ...day,
          newTasks: updatedTasks.length ? updatedTasks : [""],
        };
      })
    );
  };

  // SAVE ONLY NEW TASKS
  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    if (!user?.id) {
      setError("User information not found. Please login again.");
      return;
    }

    const tasksToSave = days.flatMap((day) =>
      day.newTasks
        .map((title) => title.trim())
        .filter(Boolean)
        .map((title) => ({
          title,
          date: day.date,
        }))
    );

    if (tasksToSave.length === 0) {
      setError("Please enter at least one new task.");
      return;
    }

    setLoading(true);

    try {
      let savedCount = 0;

      for (const task of tasksToSave) {
        await api.post("/api/tasks", {
          title: task.title,
          description: "",
          priority,
          start_date: task.date,
          assigned_to: user.id,
        });

        savedCount++;
      }

      setMessage(
        `${savedCount} new task(s) saved successfully!`
      );

      // Clear new inputs and reload saved tasks
      setDays((previousDays) =>
        previousDays.map((day) => ({
          ...day,
          newTasks: [""],
        }))
      );

      const response = await api.get("/api/tasks");

      const allTasks = Array.isArray(response.data.tasks)
        ? response.data.tasks
        : Array.isArray(response.data)
        ? response.data
        : [];

      setDays((previousDays) =>
        previousDays.map((day) => ({
          ...day,
          savedTasks: allTasks.filter((task) => {
            const taskDate = task.start_date
              ? String(task.start_date).slice(0, 10)
              : "";

            const assignedUser =
              task.assigned_to?.id ??
              task.assigned_to ??
              task.assigned_to_id;

            return (
              taskDate === day.date &&
              String(assignedUser) === String(user.id)
            );
          }),
        }))
      );
    } catch (err) {
      console.error("Weekly task error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to save tasks."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="weekly-task-page">
      <div className="weekly-task-card">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate("/tasks")}
        >
          ← Back to Tasks
        </button>

        <h1>Weekly Tasks</h1>

        <p className="subtitle">
          Add your tasks from Monday to Saturday.
        </p>

        <div className="week-info">
          <strong>Monday → Saturday</strong>
          <span>Sunday is a holiday</span>
        </div>

        {message && (
          <div className="success-message">{message}</div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {fetching ? (
          <p>Loading your previous tasks...</p>
        ) : (
          <form onSubmit={handleSubmit}>
            {days.map((day, dayIndex) => (
              <div className="day-card" key={day.date}>
                <div className="day-header">
                  <div>
                    <h3>{day.name}</h3>

                    <span>
                      {new Date(
                        day.date + "T00:00:00"
                      ).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* PREVIOUSLY SAVED TASKS */}
                {day.savedTasks.length > 0 && (
                  <div className="day-tasks">
                    {day.savedTasks.map((task) => (
                      <div
                        className="task-input-row"
                        key={task.id}
                      >
                        <span className="bullet">•</span>

                        <input
                          type="text"
                          value={task.title || ""}
                          readOnly
                          className="saved-task-input"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* NEW TASK INPUTS */}
                <div className="day-tasks">
                  {day.newTasks.map((task, taskIndex) => (
                    <div
                      className="task-input-row"
                      key={taskIndex}
                    >
                      <span className="bullet">•</span>

                      <input
                        type="text"
                        value={task}
                        onChange={(e) =>
                          handleTaskChange(
                            dayIndex,
                            taskIndex,
                            e.target.value
                          )
                        }
                        placeholder="Enter task..."
                      />

                      {day.newTasks.length > 1 && (
                        <button
                          type="button"
                          className="remove-task"
                          onClick={() =>
                            removeTask(dayIndex, taskIndex)
                          }
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addTask(dayIndex)}
                >
                  + Add another task
                </button>
              </div>
            ))}

            <button
              type="submit"
              className="save-weekly-task"
              disabled={loading}
            >
              {loading
                ? "Saving Tasks..."
                : "Save Weekly Tasks"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddTask;
