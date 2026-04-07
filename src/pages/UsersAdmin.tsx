import { useEffect, useState } from "react";
import api from "../api";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import { Modal } from "../components/ui/modal";
import CustomSelect from "../components/form/CustomSelect";

interface UserItem {
  id: number;
  username: string;
  email?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

type UserRole = "employee" | "admin";

const EMPTY_USER = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  role: "employee" as UserRole,
};

const EMPTY_TASK = {
  title: "",
  description: "",
  priority: "medium",
  status: "pending",
  due_date: "",
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-brand-50 text-brand-600 border border-brand-200",
  employee: "bg-gray-100 text-gray-600 border border-gray-200",
};

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [assignTaskUser, setAssignTaskUser] = useState<UserItem | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({ ...EMPTY_USER });
  const [editForm, setEditForm] = useState({ username: "", first_name: "", last_name: "", email: "", role: "employee" as UserRole, password: "" });
  const [taskForm, setTaskForm] = useState({ ...EMPTY_TASK });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("tasks/users/");
      setUsers(response.data);
    } catch (err) {
      console.error("Failed to load users", err);
      setError("Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, []);

  // ─── CREATE USER ────────────────────────────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username.trim() || !createForm.password) {
      setError("Username and password are required.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await api.post("auth/register/", {
        username: createForm.username.trim(),
        first_name: createForm.first_name.trim(),
        last_name: createForm.last_name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      });
      setCreateForm({ ...EMPTY_USER });
      setShowCreateModal(false);
      await loadUsers();
      showSuccess(`User "${createForm.username}" created successfully!`);
    } catch (err: any) {
      const d = err.response?.data;
      setError(d?.username?.[0] || d?.password?.[0] || d?.detail || "Unable to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── EDIT USER ──────────────────────────────────────────────────────────────
  const openEditUser = (user: UserItem) => {
    setEditUser(user);
    setEditForm({
      username: user.username,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role: (user.role as UserRole) || "employee",
      password: "",
    });
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      setSubmitting(true);
      setError(null);
      const payload: any = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
      };
      // Only send password if filled
      if (editForm.password?.trim()) {
        payload.password = editForm.password.trim();
      }
      await api.patch(`auth/users/${editUser.id}/`, payload);
      await loadUsers();
      setEditUser(null);
      showSuccess(`User "${editUser.username}" updated!`);
    } catch (err: any) {
      const d = err.response?.data;
      setError(d?.detail || "Failed to update user.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── DELETE USER ────────────────────────────────────────────────────────────
  const handleDeleteUser = async (user: UserItem) => {
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`auth/users/${user.id}/`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showSuccess("User deleted.");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete user. Ensure no tasks are assigned to this user first.");
    }
  };

  // ─── ASSIGN TASK ────────────────────────────────────────────────────────────
  const openAssignTask = (user: UserItem) => {
    setAssignTaskUser(user);
    setTaskForm({ ...EMPTY_TASK });
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTaskUser || !taskForm.title.trim()) {
      setError("Task title is required.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await api.post("tasks/", {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        user_id: assignTaskUser.id,
        priority: taskForm.priority,
        status: taskForm.status,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
      });
      setAssignTaskUser(null);
      showSuccess(`Task "${taskForm.title}" assigned to ${assignTaskUser.full_name || assignTaskUser.username}!`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to assign task.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchTerm.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.first_name || "").toLowerCase().includes(q) ||
      (u.last_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageMeta title="Users | Task Tracker Admin" description="Manage users, roles and tasks" />

      <div className="flex flex-col gap-5">
        {/* Alerts */}
        {error && (
          <div className="rounded-2xl border border-error-200 bg-error-50 px-5 py-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 font-bold">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 font-bold">
            {successMsg}
          </div>
        )}

        {/* Header + Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl dark:bg-white/[0.03] dark:border-gray-800">
          <Input
            type="text"
            placeholder="Search users by name, role, email..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadUsers()} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button type="button" size="sm" onClick={() => setShowCreateModal(true)}>
              + New User
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Total Users", count: users.length, color: "text-gray-700" },
            { label: "Employees", count: users.filter(u => (u.role || "employee") === "employee").length, color: "text-brand-600" },
            { label: "Admins", count: users.filter(u => u.role === "admin").length, color: "text-rose-600" },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* User Table */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-gray-800">
                  <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Username</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">Loading users…</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-gray-400">No users found.</td></tr>
                ) : filteredUsers.map(user => {
                  const displayName = user.full_name || (user.first_name ? `${user.first_name} ${user.last_name}`.trim() : user.username);
                  const initial = displayName.charAt(0).toUpperCase();
                  const role = user.role || "employee";
                  return (
                    <tr key={user.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-sm shrink-0 ${role === "admin" ? "bg-gradient-to-br from-brand-500 to-brand-600 text-white" : "bg-gray-100 text-gray-600"
                            }`}>
                            {initial}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{displayName}</p>
                            <p className="text-xs text-gray-400">{user.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">@{user.username}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-500">{user.email || "—"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${ROLE_BADGE[role] || ROLE_BADGE.employee}`}>
                          {role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2 items-center">
                          {/* Assign Task */}
                          <button
                            onClick={() => openAssignTask(user)}
                            className="px-4 py-2 bg-brand-500/10 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/30 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-brand-500/20 dark:hover:bg-brand-500/20 transition-colors whitespace-nowrap"
                            title="Assign a task to this user"
                          >
                            Assign Task
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => openEditUser(user)}
                            className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/10 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap"
                            title="Edit User"
                          >
                            Edit
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="px-3 py-1.5 text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-500/10 hover:bg-red-500/20 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap"
                            title="Delete User"
                          >
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

      {/* ─── CREATE USER MODAL ─────────────────────────────────────────────────── */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} className="max-w-md m-4">
        <div className="w-full rounded-3xl bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800">
          <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">Create New User</h2>
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">Close</button>
          </div>
          <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">First Name</label>
                <Input type="text" placeholder="First name" value={createForm.first_name} onChange={(e: any) => setCreateForm(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Last Name</label>
                <Input type="text" placeholder="Last name" value={createForm.last_name} onChange={(e: any) => setCreateForm(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Username *</label>
              <Input type="text" placeholder="username" value={createForm.username} onChange={(e: any) => setCreateForm(p => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
              <Input type="email" placeholder="email@example.com" value={createForm.email} onChange={(e: any) => setCreateForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Password *</label>
              <Input type="password" placeholder="Minimum 8 characters" value={createForm.password} onChange={(e: any) => setCreateForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Role</label>
              <select
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
                value={createForm.role}
                onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as UserRole }))}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="flex-1" disabled={submitting}>{submitting ? "Creating…" : "Create User"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── EDIT USER MODAL ───────────────────────────────────────────────────── */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} className="max-w-md m-4">
        <div className="w-full rounded-3xl bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800">
          <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Edit User</h2>
              <p className="text-xs text-gray-400 mt-0.5">@{editUser?.username}</p>
            </div>
            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">Close</button>
          </div>
          <form onSubmit={handleEditUser} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">First Name</label>
                <Input type="text" placeholder="First name" value={editForm.first_name} onChange={(e: any) => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Last Name</label>
                <Input type="text" placeholder="Last name" value={editForm.last_name} onChange={(e: any) => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
              <Input type="email" placeholder="email@example.com" value={editForm.email} onChange={(e: any) => setEditForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">New Password (leave blank to keep current)</label>
              <Input type="password" placeholder="Leave blank to keep current" value={editForm.password} onChange={(e: any) => setEditForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Role</label>
              <select
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
                value={editForm.role}
                onChange={e => setEditForm(p => ({ ...p, role: e.target.value as UserRole }))}
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" size="sm" className="flex-1" disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── ASSIGN TASK MODAL ─────────────────────────────────────────────────── */}
      <Modal isOpen={!!assignTaskUser} onClose={() => setAssignTaskUser(null)} className="max-w-md m-4">
        <div className="w-full rounded-3xl bg-white dark:bg-gray-900 p-6 border border-gray-200 dark:border-gray-800">
          <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Assign Task</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                To: {assignTaskUser?.full_name || assignTaskUser?.username}
                {' '}({assignTaskUser?.role || "employee"})
              </p>
            </div>
            <button onClick={() => setAssignTaskUser(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">Close</button>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-brand-50 dark:bg-brand-500/10 rounded-2xl border border-brand-100 dark:border-brand-500/20">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white flex items-center justify-center text-sm font-black shrink-0">
              {(assignTaskUser?.full_name || assignTaskUser?.username || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{assignTaskUser?.full_name || assignTaskUser?.username}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">@{assignTaskUser?.username} · {assignTaskUser?.role || "employee"}</p>
            </div>
          </div>

          <form onSubmit={handleAssignTask} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Task Title *</label>
              <Input type="text" placeholder="What needs to be done?" value={taskForm.title} onChange={(e: any) => setTaskForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Description</label>
              <textarea
                placeholder="Task details and requirements…"
                value={taskForm.description}
                onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-gray-300 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Priority</label>
                <CustomSelect
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
                  value={taskForm.priority}
                  onChange={v => setTaskForm(p => ({ ...p, priority: v }))}
                  options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Due Date</label>
                <Input type="datetime-local" value={taskForm.due_date} onChange={(e: any) => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setAssignTaskUser(null)}>Cancel</Button>
              <Button type="submit" size="sm" className="flex-1" disabled={submitting}>
                {submitting ? "Assigning…" : "Assign Task"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
