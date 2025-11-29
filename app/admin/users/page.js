"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function UsersAdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Admin — Users</h1>
      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Actions</th>
            <th>_id</th>
            <th>firstName</th>
            <th>lastName</th>
            <th>pseudo</th>
            <th>email</th>
            <th>password</th>
            <th>gender</th>
            <th>country</th>
            <th>isOnline</th>
            <th>isValidated</th>
            <th>location</th>
            <th>createdAt</th>
            <th>updatedAt</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>
                <Link href={`/admin/users/${u._id}`}><button>View / Edit</button></Link>
              </td>
              <td>{u._id}</td>
              <td>{u.firstName}</td>
              <td>{u.lastName}</td>
              <td>{u.pseudo}</td>
              <td>{u.email}</td>
              <td>{u.password ? "********" : ""}</td>
              <td>{u.gender}</td>
              <td>{u.country}</td>
              <td>{u.isOnline ? "Yes" : "No"}</td>
              <td>{u.isValidated ? "Yes" : "No"}</td>
              <td>
                {u.location ? `lat:${u.location.lat ?? ""} lng:${u.location.lng ?? ""}` : "—"}
              </td>
              <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : ""}</td>
              <td>{u.updatedAt ? new Date(u.updatedAt).toLocaleString() : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}