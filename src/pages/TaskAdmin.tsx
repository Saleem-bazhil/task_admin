import { useEffect, useState, useRef, useCallback } from "react";
import api from "../api";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import { getStoredUser } from "../utils/auth";
import { Modal } from "../components/ui/modal";
import CustomSelect from "../components/form/CustomSelect";
import TaskFormFields from "./TaskFormFields";
import FileUploadSection from "./FileUploadSection";

interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
}

interface Comment {
  id: number;
  user: User;
  content: string;
  created_at: string;
}

interface Attachment {
  id: number;
  user: User;
  file: string;
  file_url?: string;
  filename: string;
  created_at: string;
}

interface Task {
  id: number;
  title: string;
  description: string;
  user: User | null;
  assigned_to?: User[];
  assigned_by?: User | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  updated_at?: string;
  comments?: Comment[];
  attachments?: Attachment[];
  comments_count?: number;
  attachments_count?: number;
  last_message_preview?: { user: string; content: string; created_at: string };
}

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20",
  medium: "bg-yellow-500/10 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/20",
  low: "bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-500/10 dark:bg-blue-500/10 text-gray-600 dark:text-blue-400 border border-gray-200 dark:border-blue-500/20",
  in_progress: "bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
  completed: "bg-green-500/10 dark:bg-green-500/10 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/20",
};

interface TaskFormData {
  title: string;
  description: string;
  user_id: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  due_date: string;
}

const EMPTY_FORM: TaskFormData = { title: "", description: "", user_id: "", priority: "medium", status: "pending", due_date: "" };

export default function TaskAdmin() {
  const currentUser = getStoredUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [collab, setCollab] = useState<Task | null>(null);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<Task | null>(null);
  const [historyEntries, setHistoryEntries] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Forms
  const [createForm, setCreateForm] = useState<TaskFormData>({ ...EMPTY_FORM });
  const [editForm, setEditForm] = useState<TaskFormData>({ ...EMPTY_FORM });

  // Collaboration
  const [newComment, setNewComment] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [localAttachments, setLocalAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const [createFormFiles, setCreateFormFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const createTitleInputRef = useRef<HTMLInputElement>(null);
  const createDescriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fetchTasks(); fetchUsers(); }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [localComments]);
  // Sync collab local state when modal opens
  useEffect(() => {
    if (collab) {
      setLocalComments(collab.comments || []);
      setLocalAttachments(collab.attachments || []);
    }
  }, [collab?.id]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const fetchTasks = async () => {
    try { setLoading(true); setError(null); const r = await api.get("tasks/"); setTasks(r.data); }
    catch { setError("Unable to load tasks. Check your connection."); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try { const r = await api.get("tasks/users/"); setUsers(r.data); }
    catch { /* silent */ }
  };


  // ─── CREATE ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) { setError("Task title is required."); return; }
    try {
      setSubmitting(true); setError(null);
      const r = await api.post("tasks/", {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        assigned_to_ids: createForm.user_id ? [Number(createForm.user_id)] : [],
        priority: createForm.priority,
        status: createForm.status,
        due_date: createForm.due_date ? new Date(createForm.due_date).toISOString() : null,
      });

      // Upload files if any
      if (createFormFiles.length > 0) {
        for (const file of createFormFiles) {
          const fd = new FormData();
          fd.append("task", String(r.data.id));
          fd.append("file", file);
          try {
            await api.post("attachments/", fd, { headers: { "Content-Type": "multipart/form-data" } });
          } catch (err) {
            console.error("File upload failed", err);
          }
        }
      }

      setTasks(prev => [r.data, ...prev]);
      setCreateForm({ ...EMPTY_FORM });
      setCreateFormFiles([]);
      if (createFileInputRef.current) createFileInputRef.current.value = "";
      setShowCreateModal(false);
      showSuccess(`Task "${r.data.title}" created successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Unable to create task.");
    } finally { setSubmitting(false); }
  };

  const handleCreateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setCreateFormFiles(prev => [...prev, ...Array.from(files)]);
      if (createFileInputRef.current) {
        createFileInputRef.current.value = "";
      }
      setTimeout(() => {
        createTitleInputRef.current?.focus();
      }, 0);
    }
  };

  const removeCreateFile = useCallback((index: number) => {
    setCreateFormFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ─── EDIT ──────────────────────────────────────────────────────────────────
  const handleEdit = (task: Task) => {
    setEditForm({
      title: task.title,
      description: task.description,
      user_id: task.assigned_to?.[0]?.id ? String(task.assigned_to[0].id) : "",
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "",
    });
    setEditTask(task);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;
    try {
      setSubmitting(true); setError(null);
      const r = await api.patch(`tasks/${editTask.id}/`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        assigned_to_ids: editForm.user_id ? [Number(editForm.user_id)] : [],
        priority: editForm.priority,
        status: editForm.status,
        due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null,
      });
      setTasks(prev => prev.map(t => t.id === editTask.id ? r.data : t));
      setEditTask(null);
      showSuccess(`Task "${r.data.title}" updated!`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Update failed.");
    } finally { setSubmitting(false); }
  };

  // ─── DELETE ────────────────────────────────────────────────────────────────
  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`tasks/${task.id}/`);
      setTasks(prev => prev.filter(t => t.id !== task.id));
      showSuccess("Task deleted.");
    } catch {
      alert("Only admins can delete tasks.");
    }
  };

  // ─── INLINE STATUS ─────────────────────────────────────────────────────────
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await api.patch(`tasks/${taskId}/`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t));
    } catch { fetchTasks(); }
  };

  // ─── HISTORY ──────────────────────────────────────────────────────────────
  const fetchHistory = async (task: Task) => {
    try {
      setHistoryLoading(true);
      setSelectedTaskForHistory(task);
      const r = await api.get(`tasks/${task.id}/history/`);
      setHistoryEntries(r.data);
    } catch {
      setError("Failed to load task history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // ─── COLLABORATION ─────────────────────────────────────────────────────────
  const handleSendComment = async () => {
    if (!collab || !newComment.trim()) return;
    const content = newComment.trim();
    const optimistic: Comment = {
      id: Date.now(),
      user: { id: currentUser?.id, username: currentUser?.username || "Admin" } as User,
      content,
      created_at: new Date().toISOString(),
    };
    setLocalComments(prev => [...prev, optimistic]);
    setNewComment("");
    try {
      const r = await api.post("comments/", { task: collab.id, content });
      setLocalComments(prev => prev.map(c => c.id === optimistic.id ? r.data : c));
      // Update count on main list
      setTasks(prev => prev.map(t => t.id === collab.id ? { ...t, comments_count: (t.comments_count || 0) + 1 } : t));
    } catch {
      setLocalComments(prev => prev.filter(c => c.id !== optimistic.id));
      alert("Failed to send comment.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !collab) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("task", String(collab.id));
      fd.append("file", file);
      const r = await api.post("attachments/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setLocalAttachments(prev => [...prev, r.data]);
      setTasks(prev => prev.map(t => t.id === collab.id ? { ...t, attachments_count: (t.attachments_count || 0) + 1 } : t));
    } catch { alert("Upload failed."); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const filteredTasks = tasks.filter(t => {
    const q = searchTerm.toLowerCase();
    const matchSearch = t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q) || (t.user?.username || "").toLowerCase().includes(q);
    const matchStatus = filterStatus ? t.status === filterStatus : true;
    const matchPriority = filterPriority ? t.priority === filterPriority : true;
    return matchSearch && matchStatus && matchPriority;
  });

  // Memoized form change handlers
  const handleCreateFormChange = useCallback((k: string, v: string) => {
    setCreateForm(prev => ({ ...prev, [k]: v }));
  }, []);

  const handleEditFormChange = useCallback((k: string, v: string) => {
    setEditForm(prev => ({ ...prev, [k]: v }));
  }, []);

  // ─── FORM FIELDS COMPONENT ─────────────────────────────────────────────────
  // Component moved to TaskFormFields.tsx for proper memoization

  // ─── FILE UPLOAD DISPLAY COMPONENT ────────────────────────────────────────
  // Component moved to FileUploadSection.tsx for proper memoization

  return (
    <>
      <PageMeta title="Task Management | Admin" description="Full CRUD task management with collaboration" />

      <div className="flex flex-col gap-5">
        {/* Alerts */}
        {error && (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 font-bold flex gap-3">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 font-bold flex gap-3">
            {successMsg}
          </div>
        )}

        {/* Top Bar: Filters + Create */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white dark:bg-[#1a2233] border border-gray-200 dark:border-gray-800 rounded-2xl">
          <Input
            type="text"
            placeholder="Search tasks, users..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <div className="w-40">
            <CustomSelect
              className="h-10 border border-gray-300 rounded-lg bg-transparent text-gray-700 dark:text-gray-300 dark:border-gray-700"
              placeholder="All Statuses"
              value={filterStatus}
              onChange={v => setFilterStatus(v)}
              options={[{ value: "", label: "All Statuses" }, { value: "pending", label: "Pending" }, { value: "in_progress", label: "In Progress" }, { value: "completed", label: "Completed" }]}
            />
          </div>
          <div className="w-40">
            <CustomSelect
              className="h-10 border border-gray-300 rounded-lg bg-transparent text-gray-700 dark:text-gray-300 dark:border-gray-700"
              placeholder="All Priorities"
              value={filterPriority}
              onChange={v => setFilterPriority(v)}
              options={[{ value: "", label: "All Priorities" }, { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]}
            />
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="sm" className="whitespace-nowrap px-5">
            + New Task
          </Button>
        </div>

        {/* Task Table */}
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl min-h-[300px]">
          <div className="overflow-visible">
            <table className="w-full table-auto text-left min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#1a2233] border-b border-gray-200 dark:border-gray-800">
                  <th className="px-5 py-4 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest">ID</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest">TITLE</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest">USER</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest">STATUS</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest">PRIORITY</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest">DUE DATE</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest">CREATED AT</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-600 dark:text-gray-500 uppercase tracking-widest text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-10 text-center text-gray-500 dark:text-gray-400 italic">Loading tasks…</td></tr>
                ) : filteredTasks.length === 0 ? (
                  <tr><td colSpan={8} className="p-10 text-center text-gray-500 dark:text-gray-400">No tasks match your filters.</td></tr>
                ) : filteredTasks.map(task => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed";
                  return (
                    <tr key={task.id} className="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors group">
                      <td className="px-5 py-4 text-xs font-bold text-gray-700 dark:text-gray-400">#{task.id}</td>
                      <td className="px-5 py-4 max-w-[220px]">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-200 truncate">{task.title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">{task.description}</p>
                        {/* Last message preview */}
                        {task.last_message_preview && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-500 italic truncate max-w-[180px] mt-1">
                            {task.last_message_preview.user}: "{task.last_message_preview.content}"
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {task.assigned_to && task.assigned_to.length > 0 ? (
                            <>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                                {task.assigned_to[0].username?.charAt(0).toUpperCase() ?? "?"}
                              </div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                {task.assigned_to[0].full_name || task.assigned_to[0].username}
                                {task.assigned_to.length > 1 && ` +${task.assigned_to.length - 1}`}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400">?</div>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 italic">Unassigned</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <CustomSelect
                          className={`h-8 w-28 px-2 text-[10px] font-black uppercase tracking-widest border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-transparent ${STATUS_BADGE[task.status]}`}
                          value={task.status}
                          onChange={v => handleStatusChange(task.id, v)}
                          options={[{ value: "pending", label: "Pending" }, { value: "in_progress", label: "In Progress" }, { value: "completed", label: "Completed" }]}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <CustomSelect
                          className={`h-8 w-28 px-2 text-[10px] font-black uppercase tracking-widest border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-transparent ${PRIORITY_BADGE[task.priority]}`}
                          value={task.priority}
                          onChange={() => { /* Priority change handled via API if needed */ }}
                          options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold ${isOverdue ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-600 dark:text-gray-400"}`}>
                          {task.due_date ? new Date(task.due_date).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" }) : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-500 font-medium whitespace-nowrap">
                        {new Date(task.created_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2 items-center">
                          {/* Chat */}
                          <button onClick={() => setCollab(task)} className="px-3 py-1.5 bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-500/20 dark:hover:bg-blue-500/20 transition-colors">
                            Chat
                          </button>
                          {/* Edit */}
                          <button onClick={() => handleEdit(task)} className="px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-amber-500/20 dark:hover:bg-amber-500/20 transition-colors">
                            Edit
                          </button>
                          {/* History */}
                          <button onClick={() => fetchHistory(task)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-500/10 text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-500/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-gray-500/20 transition-colors">
                            History
                          </button>
                          {/* Delete */}
                          <button onClick={() => handleDelete(task)} className="px-3 py-1.5 bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 dark:hover:bg-red-500/20 transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── CREATE TASK MODAL ─────────────────────────────────────────────────── */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-lg m-4">
        <div className="w-full rounded-3xl bg-white dark:bg-[#111827] p-6 border border-gray-200 dark:border-gray-800">
          <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Create New Task</h2>
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">Close</button>
          </div>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <TaskFormFields form={createForm} onChange={handleCreateFormChange} users={users} titleRef={createTitleInputRef} descriptionRef={createDescriptionInputRef} />
            <FileUploadSection files={createFormFiles} onFileSelect={handleCreateFileUpload} onRemove={removeCreateFile} isCreating={true} fileInputRef={createFileInputRef} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="flex-1" disabled={submitting}>{submitting ? "Creating…" : "Create Task"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── EDIT TASK MODAL ───────────────────────────────────────────────────── */}
      <Modal isOpen={!!editTask} onClose={() => setEditTask(null)} className="max-w-lg m-4">
        <div className="w-full rounded-3xl bg-white dark:bg-[#111827] p-6 border border-gray-200 dark:border-gray-800">
          <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Edit Task #{editTask?.id}</h2>
            <button onClick={() => setEditTask(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">Close</button>
          </div>
          <form onSubmit={handleEditSave} className="flex flex-col gap-4">
            <TaskFormFields form={editForm} onChange={handleEditFormChange} users={users} />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setEditTask(null)}>Cancel</Button>
              <Button type="submit" size="sm" className="flex-1" disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── COLLABORATION MODAL ──────────────────────────────────────────────── */}
      <Modal isOpen={!!collab} onClose={() => setCollab(null)} className="max-w-3xl m-4">
        <div className="w-full rounded-[2.5rem] bg-white dark:bg-[#111827] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800" style={{ maxHeight: "85vh" }}>
          {/* Header */}
          <div className="p-7 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Task Discussion #{collab?.id}</p>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{collab?.title}</h2>
            </div>
            <button onClick={() => setCollab(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors">Close</button>
          </div>

          {/* Comments feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-7 space-y-5 min-h-0 bg-gray-50 dark:bg-gray-900/30">
            {localComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400 gap-3">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl flex items-center justify-center shadow text-2xl font-black text-gray-700 dark:text-gray-400">CHAT</div>
                <p className="text-sm font-bold">No messages yet</p>
              </div>
            ) : localComments.map((c, i) => {
              const isMe = c.user?.id === currentUser?.id;
              const isSubmission = c.content?.includes("[WORK SUBMITTED]");
              return (
                <div key={c.id || i} className={`flex gap-4 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm shrink-0 ${isMe ? "bg-brand-500 text-white" : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-700"}`}>
                    {(c.user?.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className={`space-y-1 ${isMe ? "items-end flex flex-col" : ""}`}>
                    <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <span className="text-[11px] font-black text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                        {isMe ? "You (Admin)" : c.user?.full_name || c.user?.username}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                        {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className={`p-4 text-sm leading-relaxed shadow-sm rounded-2xl ${isSubmission ? "bg-indigo-500/10 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20"
                      : isMe ? "bg-brand-600 dark:bg-brand-600 text-white rounded-tr-none"
                        : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300 rounded-tl-none border border-gray-200 dark:border-gray-800"
                      }`}>
                      {c.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Attachments bar */}
          {localAttachments.length > 0 && (
            <div className="px-7 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800 flex gap-3 overflow-x-auto shrink-0">
              <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-500 tracking-widest my-auto shrink-0">Attachments:</span>
              {localAttachments.map((a, i) => (
                <div key={a.id || i} className="inline-flex items-center gap-2 bg-white dark:bg-[#111827] px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-400 truncate max-w-[100px]">{a.filename}</span>
                  <a href={a.file_url || a.file} target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 text-[10px] font-black uppercase">View</a>
                  <a href={a.file_url || a.file} download={a.filename} className="text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-[10px] font-black uppercase">Download</a>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="p-7 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] flex gap-4 shrink-0">
            <input
              type="text"
              placeholder="Type your message…"
              className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-4 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 dark:focus:ring-brand-500/20 outline-none"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendComment(); }
              }}
              onKeyUp={e => e.stopPropagation()}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 h-14 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-800 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all"
            >
              {uploading ? "..." : "Attach"}
            </button>
            <button
              onClick={handleSendComment}
              disabled={!newComment.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white px-6 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all"
            >
              Send
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── HISTORY MODAL ───────────────────────────────────────────────────── */}
      <Modal isOpen={!!selectedTaskForHistory} onClose={() => setSelectedTaskForHistory(null)} className="max-w-2xl m-4">
        <div className="w-full rounded-[2.5rem] bg-white dark:bg-[#111827] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800" style={{ maxHeight: "85vh" }}>
          <div className="p-7 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Timeline · Task #{selectedTaskForHistory?.id}</p>
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">Activity History</h2>
            </div>
            <button onClick={() => setSelectedTaskForHistory(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">Close</button>
          </div>

          <div className="flex-1 overflow-y-auto p-7 min-h-0">
            {historyLoading ? (
              <div className="flex justify-center py-20 text-gray-500 dark:text-gray-400 italic">Loading timeline…</div>
            ) : historyEntries.length === 0 ? (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">No history records found for this task.</div>
            ) : (
              <div className="relative border-l-2 border-gray-200 dark:border-gray-800 ml-3 pl-8 space-y-8">
                {historyEntries.map((entry, idx) => (
                  <div key={entry.id || idx} className="relative">
                    {/* Dot */}
                    <div className="absolute -left-[37px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 bg-blue-500 shadow-sm" />

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                          {entry.action.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-[8px] font-black text-gray-700 dark:text-gray-400">
                          {entry.user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] text-gray-600 dark:text-gray-400 italic">by {entry.user?.full_name || entry.user?.username || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-7 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
            <Button onClick={() => setSelectedTaskForHistory(null)} variant="outline" size="sm">Close Timeline</Button>
          </div>
        </div>
      </Modal>
    </>
  );

}
