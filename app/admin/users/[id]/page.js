"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function UserEditPage({ params }) {
  // If using dynamic route in app router, Next will provide params; otherwise use search params.
  const router = useRouter();
  const userId = params?.id || null;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function fetchUser() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) throw new Error("Failed to load user");
      const data = await res.json();
      setUser(data);
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    fetchUser();
  }, [userId]);

  if (!userId) return <div>No user id provided in URL</div>;
  if (loading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error}</div>;

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === "location.lat" || name === "location.lng") {
      setUser((prev) => ({ ...prev, location: { ...prev.location, [name.split(".")[1]]: value ? Number(value) : null } }));
    } else if (type === "checkbox") {
      setUser((prev) => ({ ...prev, [name]: checked }));
    } else {
      setUser((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Note: if you store hashed passwords, don't send plain text here unless you want to replace it.
      const payload = { ...user };
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      await res.json();
      router.push("/admin/users");
    } catch (err) {
      setError(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      router.push("/admin/users");
    } catch (err) {
      setError(err.message || "Error deleting");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Edit User</h1>
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      <form onSubmit={handleSave} style={{ maxWidth: 800 }}>
        <div>
          <label>firstName: <input name="firstName" value={user.firstName || ""} onChange={handleChange} /></label>
        </div>
        <div>
          <label>lastName: <input name="lastName" value={user.lastName || ""} onChange={handleChange} /></label>
        </div>
        <div>
          <label>pseudo: <input name="pseudo" value={user.pseudo || ""} onChange={handleChange} /></label>
        </div>
        <div>
          <label>email: <input name="email" value={user.email || ""} onChange={handleChange} /></label>
        </div>
        <div>
          <label>password: <input name="password" value={user.password || ""} onChange={handleChange} /></label>
          <div style={{ fontSize: 12, color: "#666" }}>
            Note: if your app stores password hashes, updating here will replace the stored value.
          </div>
        </div>
        <div>
          <label>gender: <input name="gender" value={user.gender || ""} onChange={handleChange} /></label>
        </div>
        <div>
          <label>country: <input name="country" value={user.country || ""} onChange={handleChange} /></label>
        </div>
        <div>
          <label>
            isOnline:
            <input type="checkbox" name="isOnline" checked={!!user.isOnline} onChange={handleChange} />
          </label>
        </div>
        <div>
          <label>
            isValidated:
            <input type="checkbox" name="isValidated" checked={!!user.isValidated} onChange={handleChange} />
          </label>
        </div>
        <fieldset>
          <legend>Location</legend>
          <div>
            <label>lat: <input name="location.lat" value={(user.location && user.location.lat) || ""} onChange={handleChange} /></label>
          </div>
          <div>
            <label>lng: <input name="location.lng" value={(user.location && user.location.lng) || ""} onChange={handleChange} /></label>
          </div>
        </fieldset>
        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>
          <button type="button" onClick={handleDelete} style={{ marginLeft: 8, color: "white", background: "red" }}>
            Delete user
          </button>
          <button type="button" onClick={() => router.push("/admin/users")} style={{ marginLeft: 8 }}>
            Cancel
          </button>
        </div>
      </form>
      <div style={{ marginTop: 12 }}>
        <strong>Meta</strong>
        <div>_id: {user._id}</div>
        <div>createdAt: {user.createdAt ? new Date(user.createdAt).toLocaleString() : ""}</div>
        <div>updatedAt: {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : ""}</div>
      </div>
    </div>
  );
}