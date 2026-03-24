import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ""
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("iga_token");
  if (token) {
    // Ensure we always attach a plain `Authorization` header.
    // Some axios header implementations aren't compatible with dot assignment.
    config.headers = {
      ...(config.headers as any),
      Authorization: `Bearer ${token}`
    };
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // JWT is missing/invalid/expired: force re-login so protected actions work again.
      localStorage.removeItem("iga_token");
      localStorage.removeItem("iga_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

