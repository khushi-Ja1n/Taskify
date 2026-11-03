import { useState } from "react";
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

  // Monday of the current week
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
      tasks: [""],
    });
  }

  return days;
}



function AddTask() {

  const navigate = useNavigate();

  const [days, setDays] = useState(getWeekDays());

  const [priority, setPriority] = useState("medium");

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");


  // =========================================
  // CHANGE TASK
  // =========================================

  const handleTaskChange = (
    dayIndex,
    taskIndex,
    value
  ) => {

    setDays((prevDays) => {

      const updatedDays = [...prevDays];

      updatedDays[dayIndex].tasks[taskIndex] =
        value;

      return updatedDays;
    });
  };


  // =========================================
  // ADD ANOTHER TASK
  // =========================================

  const addTask = (dayIndex) => {
  setDays((prevDays) =>
    prevDays.map((day, index) =>
      index === dayIndex
        ? {
            ...day,
            tasks: [...day.tasks, ""],
          }
        : day
    )
  );
};


  // =========================================
  // REMOVE TASK
  // =========================================

  const removeTask = (
    dayIndex,
    taskIndex
  ) => {

    setDays((prevDays) => {

      const updatedDays = [...prevDays];

      // At least one input should remain
      if (
        updatedDays[dayIndex].tasks.length === 1
      ) {
        updatedDays[dayIndex].tasks[0] = "";
      } else {
        updatedDays[dayIndex].tasks.splice(
          taskIndex,
          1
        );
      }

      return updatedDays;
    });
  };


  // =========================================
  // SAVE WEEKLY TASKS
  // =========================================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setMessage("");
    setError("");

    setLoading(true);

    try {

      const token =
        localStorage.getItem("token");

      const user =
        JSON.parse(
          localStorage.getItem("user")
        );


      if (!user?.id) {
        throw new Error(
          "User information not found. Please login again."
        );
      }


      // =====================================
      // CREATE ALL TASKS
      // =====================================

      
let totalTasks = 0;

for (const day of days) {
  for (const taskTitle of day.tasks) {
    const title = taskTitle.trim();

    if (!title) continue;

    await api.post(
      "/api/tasks",
      {
        title,
        description: "",
        priority,
        start_date: day.date,
        assigned_to: user.id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    totalTasks++;
  }
}



      // No task entered
      if (totalTasks === 0) {

        setError(
          "Please enter at least one task."
        );

        return;
      }


      setMessage(
        `${totalTasks} task(s) saved successfully!`
      );


      // Go to tasks after save
      setTimeout(() => {

        navigate("/tasks");

      }, 1000);


    } catch (error) {

      console.error(
        "Weekly task error:",
        error
      );

      setError(
        error.response?.data?.message ||
        error.message ||
        "Failed to create tasks"
      );

    } finally {

      setLoading(false);

    }
  };


  return (

    <div className="weekly-task-page">

      <div className="weekly-task-card">


        {/* BACK */}

        <button
          className="back-button"
          onClick={() =>
            navigate("/tasks")
          }
        >
          ← Back to Tasks
        </button>


        {/* HEADER */}

        <h1>Weekly Tasks</h1>

        <p className="subtitle">
          Add your tasks from Monday to Saturday.
        </p>


        {/* WEEK INFO */}

        <div className="week-info">

          <strong>
            Monday → Saturday
          </strong>

          <span>
            Sunday is a holiday
          </span>

        </div>


        {/* SUCCESS */}

        {message && (

          <div className="success-message">
            {message}
          </div>

        )}


        {/* ERROR */}

        {error && (

          <div className="error-message">
            {error}
          </div>

        )}


        


        {/* DAYS */}

        <form onSubmit={handleSubmit}>

          {days.map(
            (day, dayIndex) => (

              <div
                className="day-card"
                key={day.date}
              >

                {/* DAY HEADER */}

                <div className="day-header">

                  <div>

                    <h3>
                      {day.name}
                    </h3>

                    <span>
                      {new Date(
                        day.date
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>

                  </div>

                </div>


                {/* TASK INPUTS */}

                <div className="day-tasks">

                  {day.tasks.map(
                    (task, taskIndex) => (

                      <div
                        className="task-input-row"
                        key={taskIndex}
                      >

                        <span className="bullet">
                          •
                        </span>

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


                        {/* DELETE TASK */}

                        {day.tasks.length > 1 && (

                          <button
                            type="button"
                            className="remove-task"
                            onClick={() =>
                              removeTask(
                                dayIndex,
                                taskIndex
                              )
                            }
                          >
                            ×
                          </button>

                        )}

                      </div>

                    )
                  )}

                </div>


                {/* ADD ANOTHER */}

          <button
  type="button"
  onClick={() => addTask(dayIndex)}
>
  + Add another task
</button>

              </div>

            )
          )}


          {/* SAVE */}

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

      </div>

    </div>
  );
}

export default AddTask;