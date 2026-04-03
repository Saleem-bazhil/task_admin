export const ACCESS_TOKEN_KEY = "access";
export const REFRESH_TOKEN_KEY = "refresh";
export const USER_STORAGE_KEY = "user";

export const isAuthenticated = () => Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));

export const getStoredUser = () => {
  const rawUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

export const persistAuthSession = ({
  access,
  refresh,
  user,
}: {
  access: string;
  refresh?: string;
  user: unknown;
}) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);

  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
};
