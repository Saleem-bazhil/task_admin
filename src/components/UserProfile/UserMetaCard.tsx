import { getStoredUser } from "../../utils/auth";

export default function UserMetaCard() {
  const user = getStoredUser();
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "Admin User";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-500 text-3xl font-bold text-white shadow-sm shrink-0">
            {initials}
          </div>
          <div className="text-center xl:text-left">
            <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
              {displayName}
            </h4>
            <div className="flex flex-col items-center gap-1 xl:flex-row xl:gap-3 text-sm text-gray-500 dark:text-gray-400">
              <p>Team Member</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
