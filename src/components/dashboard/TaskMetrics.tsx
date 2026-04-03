import {
  GroupIcon,
  BoxIconLine,
} from "../../icons";

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  due_soon: number;
}

export default function TaskMetrics({ stats }: { stats: TaskStats }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
      {/* Total Tasks */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30">
          <GroupIcon className="text-brand-500 size-6" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</span>
            <h4 className="mt-2 text-4xl font-semibold text-gray-800 dark:text-white/90">
              {stats?.total || 0}
            </h4>
          </div>
        </div>
      </div>

      {/* In Progress */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/30">
          <BoxIconLine className="text-warning-500 size-6" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">In Progress</span>
            <h4 className="mt-2 text-4xl font-semibold text-gray-800 dark:text-white/90">
              {stats?.in_progress || 0}
            </h4>
          </div>
        </div>
      </div>

      {/* Pending */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Pending</span>
            <h4 className="mt-2 text-4xl font-semibold text-gray-800 dark:text-white/90">
              {stats?.pending || 0}
            </h4>
          </div>
        </div>
      </div>

      {/* Completed Tasks */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
          <BoxIconLine className="text-success-500 size-6" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
            <h4 className="mt-2 text-4xl font-semibold text-gray-800 dark:text-white/90">
              {stats?.completed || 0}
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
