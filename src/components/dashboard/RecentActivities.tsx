

export interface Activity {
  id: number | string;
  action: string;
  title: string;
  detail: string;
  timestamp: string;
  assigned_to: {
    id: number | string;
    username: string;
  };
}

export default function RecentActivities({
  activities,
}: {
  activities?: Activity[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Recent Activities
        </h3>
      </div>
      <div className="flex flex-col gap-4 pb-6">
        {!activities || activities.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">No recent activities found.</div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl dark:border-gray-800"
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                  activity.action === "completed"
                    ? "bg-green-100 text-success-500"
                    : activity.action === "in_progress"
                    ? "bg-orange-100 text-warning-500"
                    : "bg-blue-100 text-brand-500"
                }`}
              >
                {activity.action === "completed" ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                ) : activity.action === "in_progress" ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    ></path>
                  </svg>
                )}
              </div>
              <div className="flex flex-col flex-grow">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {activity.detail}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                  Assigned to:{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {activity.assigned_to?.username}
                  </span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
