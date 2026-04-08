import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import TaskMetrics from "../../components/dashboard/TaskMetrics";
import TaskStatusGraph from "../../components/dashboard/TaskStatusGraph";
import TaskActivityGraph from "../../components/dashboard/TaskActivityGraph";
import api from "../../api";

interface UserSummary {
  username?: string;
}

interface TaskItem {
  id: number;
  title: string;
  status: "pending" | "in_progress" | "completed";
  due_date: string | null;
  created_at: string;
  user?: UserSummary | null;
}

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  due_soon: number;
}

interface ActivityDatum {
  date: string;
  created: number;
  completed: number;
}

interface DashboardPayload {
  stats: TaskStats;
  activity_data: ActivityDatum[];
}

const EMPTY_STATS: TaskStats = {
  total: 0,
  pending: 0,
  in_progress: 0,
  completed: 0,
  overdue: 0,
  due_soon: 0,
};

const formatActivityLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const buildDashboardPayloadFromTasks = (tasks: TaskItem[]): DashboardPayload => {
  const now = new Date();
  const soonThreshold = new Date(now);
  soonThreshold.setDate(soonThreshold.getDate() + 3);

  const stats = tasks.reduce<TaskStats>(
    (accumulator, task) => {
      accumulator.total += 1;
      accumulator[task.status] += 1;

      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (task.status !== "completed" && dueDate < now) {
          accumulator.overdue += 1;
        } else if (task.status !== "completed" && dueDate <= soonThreshold) {
          accumulator.due_soon += 1;
        }
      }

      return accumulator;
    },
    { ...EMPTY_STATS },
  );

  const activityMap = new Map<string, ActivityDatum>();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    activityMap.set(key, {
      date: formatActivityLabel(date),
      created: 0,
      completed: 0,
    });
  }

  tasks.forEach((task) => {
    const createdKey = new Date(task.created_at).toISOString().slice(0, 10);
    const createdEntry = activityMap.get(createdKey);
    if (createdEntry) {
      createdEntry.created += 1;
      if (task.status === "completed") {
        createdEntry.completed += 1;
      }
    }
  });

  return {
    stats,
    activity_data: Array.from(activityMap.values()),
  };
};

export default function Home() {
  const [data, setData] = useState<DashboardPayload>({
    stats: EMPTY_STATS,
    activity_data: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const taskResponse = await api.get("tasks/");
        const tasks = Array.isArray(taskResponse.data) ? taskResponse.data : [];
        const sortedTasks = [...tasks].sort(
          (left, right) =>
            new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
        );

        setRecentTasks(sortedTasks.slice(0, 5));

        try {
          const dashboardResponse = await api.get("tasks/dashboard/");
          setData(dashboardResponse.data);
        } catch (dashboardError: any) {
          console.error("Failed to fetch dashboard stats", dashboardError);
          setData(buildDashboardPayloadFromTasks(sortedTasks));
        }
      } catch (err: any) {
        console.error("Failed to load dashboard data", err);
        setError(
          err.response?.data?.detail ||
            "Failed to load dashboard data. Please make sure you are logged in.",
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-error-500 text-center p-6 bg-error-50 dark:bg-error-500/10 rounded-xl">
          <p className="font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="SaaS Admin Dashboard | Task Tracker"
        description="Fast SaaS admin dashboard with task operations and activity insights."
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12">
          <TaskMetrics stats={data.stats} />
        </div>
        <div className="col-span-12 xl:col-span-6 flex flex-col">
          <TaskStatusGraph stats={data.stats} />
        </div>
        <div className="col-span-12 xl:col-span-6 flex flex-col">
          <TaskActivityGraph data={data.activity_data} />
        </div>

        <div className="col-span-12 mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              Recent Tasks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 uppercase text-gray-700 dark:bg-white/[0.02] dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-3 font-medium">Task</th>
                    <th className="px-5 py-3 font-medium">Assignee</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTasks.map((task) => (
                    <tr key={task.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-5 py-3 text-gray-800 dark:text-white/90 font-medium">
                        {task.title}
                      </td>
                      <td className="px-5 py-3">{task.user?.username || "-"}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            task.status === "completed"
                              ? "bg-success-100 text-success-800 dark:bg-success-500/10 dark:text-success-500"
                              : task.status === "in_progress"
                                ? "bg-warning-100 text-warning-800 dark:bg-warning-500/10 dark:text-warning-500"
                                : "bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-gray-400"
                          }`}
                        >
                          {task.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentTasks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-gray-500">
                        No tasks yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
