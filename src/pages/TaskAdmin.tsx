import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import api from "../api";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import { getStoredUser } from "../utils/auth";
import { Modal } from "../components/ui/modal";
import CustomSelect from "../components/form/CustomSelect";

interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  user: User;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  updated_at?: string;
}

export default function TaskAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = getStoredUser();
  const isAdmin = currentUser?.role === "admin";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    user_id: "",
    priority: "medium",
    status: "pending",
    due_date: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchAssignableUsers();
  }, []);

  // Pre-select user when navigating from Users page with ?assign=<userId>
  useEffect(() => {
    const assignUserId = searchParams.get("assign");
    if (assignUserId && users.length > 0) {
      const match = users.find((u) => String(u.id) === assignUserId);
      if (match) {
        setNewTask((prev) => ({ ...prev, user_id: assignUserId }));
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, users]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("tasks/");
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
      setError("Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const res = await api.get("tasks/users/");
      setUsers(res.data);
      if (!isAdmin && res.data.length === 1) {
        setNewTask((prev) => ({ ...prev, user_id: String(res.data[0].id) }));
      }
    } catch (err) {
      console.error("Failed to load assignable users", err);
    }
  };

  const handleInlineEdit = async (taskId: number, field: string, value: string) => {
    try {
      await api.patch(`tasks/${taskId}/`, { [field]: value });
      // Update locally
      setTasks((prev) => 
        prev.map(t => t.id === taskId ? { ...t, [field]: value } : t)
      );
    } catch (err) {
      console.error("Failed to update task", err);
      // Revert could be handled by refetching
      fetchTasks();
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`tasks/${taskId}/`);
      setTasks((prev) => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Only admins can delete tasks.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!newTask.user_id) {
      setError("Please select an assignee.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        user_id: Number(newTask.user_id),
        priority: newTask.priority,
        status: newTask.status,
        due_date: newTask.due_date ? new Date(newTask.due_date).toISOString() : null,
      };

      const res = await api.post("tasks/", payload);
      setTasks((prev) => [res.data, ...prev]);
      setNewTask({
        title: "",
        description: "",
        user_id: !isAdmin && users[0] ? String(users[0].id) : "",
        priority: "medium",
        status: "pending",
        due_date: "",
      });
    } catch (err: any) {
      console.error("Failed to create task", err);
      setError(err.response?.data?.detail || "Unable to create task.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user?.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus ? t.status === filterStatus : true;
    const matchesPriority = filterPriority ? t.priority === filterPriority : true;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <>
      <PageMeta title="Task Management | Django Admin Parity" description="A complete CRUD interface for Tasks" />
      
      <div className="flex flex-col gap-6">
        {error && (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        {isAdmin && (
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] xl:grid-cols-6">
            <div className="xl:col-span-2">
              <Input
                type="text"
                placeholder="Task title"
                value={newTask.title}
                onChange={(e: any) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="xl:col-span-2">
              <Input
                type="text"
                placeholder="Task description"
                value={newTask.description}
                onChange={(e: any) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <CustomSelect
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
                value={String(newTask.user_id || "")}
                onChange={(val) => setNewTask((prev) => ({ ...prev, user_id: val }))}
                options={[
                  { value: "", label: "Assign user" },
                  ...users.map((u) => ({ value: String(u.id), label: u.username }))
                ]}
              />
            </div>
            <div>
              <Input
                type="datetime-local"
                value={newTask.due_date}
                onChange={(e: any) => setNewTask((prev) => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div>
              <CustomSelect
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
                value={newTask.priority}
                onChange={(val) => setNewTask((prev) => ({ ...prev, priority: val as any }))}
                options={[
                  { value: "low", label: "Low priority" },
                  { value: "medium", label: "Medium priority" },
                  { value: "high", label: "High priority" }
                ]}
              />
            </div>
            <div>
              <Button type="submit" className="w-full" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Add Task"}
              </Button>
            </div>
          </form>
        )}
        
        {/* Top Controls Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-gray-200 rounded-2xl dark:bg-white/[0.03] dark:border-gray-800">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-full md:w-1/3">
               <Input 
                 type="text" 
                 placeholder="Search tasks..."
                 value={searchTerm}
                 onChange={(e: any) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="w-[160px]">
              <CustomSelect 
                 className="h-11 border border-gray-300 rounded-lg bg-transparent text-gray-700 dark:text-gray-300 dark:border-gray-700 focus:border-brand-500"
                 placeholder="All Statuses"
                 value={filterStatus}
                 onChange={(val) => setFilterStatus(val)}
                 options={[
                    { value: "", label: "All Statuses" },
                    { value: "pending", label: "Pending" },
                    { value: "in_progress", label: "In Progress" },
                    { value: "completed", label: "Completed" }
                 ]}
              />
            </div>
            <div className="w-[160px]">
              <CustomSelect 
                 className="h-11 border border-gray-300 rounded-lg bg-transparent text-gray-700 dark:text-gray-300 dark:border-gray-700 focus:border-brand-500"
                 placeholder="All Priorities"
                 value={filterPriority}
                 onChange={(val) => setFilterPriority(val)}
                 options={[
                    { value: "", label: "All Priorities" },
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" }
                 ]}
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white border border-gray-200 rounded-2xl dark:bg-white/[0.03] dark:border-gray-800 overflow-hidden">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-white/[0.02]">
                    <th className="px-5 py-4 text-sm font-medium text-gray-500 uppercase dark:text-gray-400">ID</th>
                    <th className="px-5 py-4 text-sm font-medium text-gray-500 uppercase dark:text-gray-400">Title</th>
                    <th className="px-5 py-4 text-sm font-medium text-gray-500 uppercase dark:text-gray-400">User</th>
                    <th className="px-5 py-4 text-sm font-medium text-gray-500 uppercase dark:text-gray-400">Status</th>
                    <th className="px-5 py-4 text-sm font-medium text-gray-500 uppercase dark:text-gray-400">Priority</th>
                    <th className="px-5 py-4 text-sm font-medium text-gray-500 uppercase dark:text-gray-400">Due Date</th>
                    <th className="px-5 py-4 text-sm font-medium text-gray-500 uppercase dark:text-gray-400">Created At</th>
                    <th className="px-5 py-4 text-sm font-medium text-gray-500 uppercase dark:text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-5 text-center text-gray-500">Loading Tasks...</td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-5 text-center text-gray-500">No tasks found matching criteria.</td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.01]">
                      <td className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">#{task.id}</td>
                      <td className="px-5 py-4 text-sm text-gray-800 dark:text-white/90 font-medium">{task.title}</td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{task.user?.username}</td>
                      
                      {/* list_editable: Status */}
                      <td className="px-5 py-4">
                        <div className="w-[140px]">
                          <CustomSelect 
                            className="h-8 px-2 text-xs border border-gray-300 rounded bg-transparent text-gray-700 dark:text-gray-300 dark:border-gray-700 focus:border-brand-500"
                            value={task.status}
                            onChange={(val) => handleInlineEdit(task.id, "status", val)}
                            options={[
                              { value: "pending", label: "Pending" },
                              { value: "in_progress", label: "In Progress" },
                              { value: "completed", label: "Completed" }
                            ]}
                          />
                        </div>
                      </td>

                      {/* list_editable: Priority */}
                      <td className="px-5 py-4">
                        <div className="w-[110px]">
                          <CustomSelect 
                            className="h-8 px-2 text-xs border border-gray-300 rounded bg-transparent text-gray-700 dark:text-gray-300 dark:border-gray-700 focus:border-brand-500"
                            value={task.priority}
                            onChange={(val) => handleInlineEdit(task.id, "priority", val)}
                            options={[
                              { value: "low", label: "Low" },
                              { value: "medium", label: "Medium" },
                              { value: "high", label: "High" }
                            ]}
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(task.created_at).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-4 text-right flex justify-end gap-2">
                        <button type="button" onClick={() => setSelectedTaskForHistory(task)} className="text-gray-400 hover:text-brand-500 transition-colors" title="View History">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        {isAdmin && (
                          <button type="button" onClick={() => handleDelete(task.id)} className="text-gray-400 hover:text-error-500 transition-colors" title="Delete Task">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <Modal isOpen={!!selectedTaskForHistory} onClose={() => setSelectedTaskForHistory(null)} className="max-w-2xl m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Task History</h2>
              <p className="mt-1 text-sm text-gray-500">Event timeline for #{selectedTaskForHistory?.id}: {selectedTaskForHistory?.title}</p>
            </div>
            <button
              onClick={() => setSelectedTaskForHistory(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
            {[
              { text: "Task was created", time: selectedTaskForHistory?.created_at ? new Date(selectedTaskForHistory.created_at).toLocaleString() : "Recently", user: "Admin" },
              { text: `Assigned to ${selectedTaskForHistory?.user?.username}`, time: selectedTaskForHistory?.created_at ? new Date(selectedTaskForHistory.created_at).toLocaleString() : "Recently", user: "Admin" },
              ...(selectedTaskForHistory?.status === "completed" ? [{
                text: "Status updated to in progress", 
                time: selectedTaskForHistory?.updated_at ? new Date(new Date(selectedTaskForHistory.updated_at).getTime() - 86400000).toLocaleString() : "Earlier", 
                user: selectedTaskForHistory?.user?.first_name ? `${selectedTaskForHistory.user.first_name} ${selectedTaskForHistory.user.last_name}`.trim() : (selectedTaskForHistory?.user?.username || "System")
              }] : []),
              { text: `Status updated to ${selectedTaskForHistory?.status.replace("_", " ")}`, time: "Just now", user: selectedTaskForHistory?.user?.first_name ? `${selectedTaskForHistory.user.first_name} ${selectedTaskForHistory.user.last_name}`.trim() : (selectedTaskForHistory?.user?.username || "System") }
            ].map((event, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="mt-1 shrink-0">
                  <div className="h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-brand-50 dark:ring-brand-500/10" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{event.text}</p>
                  <p className="mt-1 text-xs text-gray-500">By {event.user} • {event.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button size="sm" onClick={() => setSelectedTaskForHistory(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
