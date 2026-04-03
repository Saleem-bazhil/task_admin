import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import TaskMetrics from "../../components/dashboard/TaskMetrics";
import TaskStatusGraph from "../../components/dashboard/TaskStatusGraph";
import TaskActivityGraph from "../../components/dashboard/TaskActivityGraph";
import api from "../../api";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get("tasks/dashboard/");
        setData(response.data);
        const taskResponse = await api.get("tasks/");
        setRecentTasks(taskResponse.data.slice(0, 5));
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch dashboard stats", err);
        setError("Failed to load dashboard data. Please make sure you are logged in.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
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
          <TaskMetrics stats={data?.stats} />
        </div>
        <div className="col-span-12 xl:col-span-6 flex flex-col">
          <TaskStatusGraph stats={data?.stats} />
        </div>
        <div className="col-span-12 xl:col-span-6 flex flex-col">
          <TaskActivityGraph data={data?.activity_data || []} />
        </div>
        
        {/* Recent Tasks List */}
        <div className="col-span-12 mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Recent Tasks</h3>
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
                  {recentTasks.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-5 py-3 text-gray-800 dark:text-white/90 font-medium">{t.title}</td>
                      <td className="px-5 py-3">{t.user?.username || "-"}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                          t.status === "completed" ? "bg-success-100 text-success-800 dark:bg-success-500/10 dark:text-success-500" :
                          t.status === "in_progress" ? "bg-warning-100 text-warning-800 dark:bg-warning-500/10 dark:text-warning-500" :
                          "bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-gray-400"
                        }`}>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentTasks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-center text-gray-500">No tasks yet.</td>
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
