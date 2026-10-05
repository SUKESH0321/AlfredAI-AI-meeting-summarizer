const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const fetchClient = async (endpoint, options = {}) => {
  const opts = { ...options, credentials: "include" };
  const res = await fetch(`${API_URL}${endpoint}`, opts);
  if (!res.ok) {
     let errorPayload;
     try { errorPayload = await res.json(); } catch(e) {}
     throw new Error(errorPayload?.error || `Request failed for ${endpoint}`);
  }
  return res.json();
}

export const getMeetings = () => fetchClient('/api/meetings');
export const getMeetingById = (id) => fetchClient(`/api/meetings/${id}`);
export const uploadMeeting = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return fetchClient('/api/meetings', { method: "POST", body: formData });
};
export const processMeeting = (id) => fetchClient(`/api/meetings/${id}/process`, { method: "POST" });
export const getTranscript = (id) => fetchClient(`/api/meetings/${id}/transcript`);
export const getMeetingInsights = (id) => fetchClient(`/api/meetings/${id}/insights`);
export const updateActionItem = (id, data) => fetchClient(`/api/action-items/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
});
export const deleteMeeting = (id) => fetchClient(`/api/meetings/${id}`, { method: "DELETE" });

// Auth
export const login = (email, password) => fetchClient('/api/auth/login', {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
export const register = (name, email, password) => fetchClient('/api/auth/register', {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, email, password })
});
export const logout = () => fetchClient('/api/auth/logout', { method: "POST" });
export const getMe = () => fetchClient('/api/auth/me');
export const updateProfile = (name, email) => fetchClient('/api/auth/profile', {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, email })
});
