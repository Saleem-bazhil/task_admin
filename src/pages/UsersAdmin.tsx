import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import api from "../api";
import PageMeta from "../components/common/PageMeta";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";

interface UserItem {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role?: string;
}

type UserRole = "employee" | "admin";

export default function UsersAdmin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "employee" as UserRole,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("chat/users/?include_self=true");
      setUsers(response.data);
    } catch (err) {
      console.error("Failed to load users", err);
      setError("Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setCreatingUser(true);
      setError(null);
      await api.post("auth/register/", {
        username: newUser.username.trim(),
        first_name: newUser.first_name.trim(),
        last_name: newUser.last_name.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
      });

      setNewUser({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "employee",
      });
      await loadUsers();
    } catch (err: any) {
      console.error("Failed to create user", err);
      const payload = err.response?.data;
      setError(
        payload?.username?.[0] ||
        payload?.password?.[0] ||
        payload?.role?.[0] ||
        payload?.detail ||
        "Unable to create user."
      );
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <>
      <PageMeta title="Users | Task Tracker" description="Create and manage users for chat access." />
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add User</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create users here instead of from chat.
          </p>

          <form onSubmit={handleCreateUser} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={(e: any) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
            />
            <Input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e: any) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
            />
            <Input
              type="text"
              placeholder="First name"
              value={newUser.first_name}
              onChange={(e: any) => setNewUser((prev) => ({ ...prev, first_name: e.target.value }))}
            />
            <Input
              type="text"
              placeholder="Last name"
              value={newUser.last_name}
              onChange={(e: any) => setNewUser((prev) => ({ ...prev, last_name: e.target.value }))}
            />
            <Input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e: any) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
            />
            <select
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-700 focus:border-brand-500 dark:border-gray-700 dark:text-gray-300"
              value={newUser.role}
              onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value as UserRole }))}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" className="min-w-32" disabled={creatingUser}>
                {creatingUser ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Available Users</h2>
            <Button type="button" variant="outline" onClick={() => void loadUsers()}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">No users found yet.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => (
                <div key={user.id} className="relative rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-white/5">
                  <button
                    type="button"
                    title={`Add task for ${user.username}`}
                    onClick={() => navigate(`/tasks?assign=${user.id}`)}
                    className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div className="text-base font-semibold text-gray-900 dark:text-white">
                    {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">@{user.username}</div>
                  <div className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-400">
                    {user.role || "employee"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
