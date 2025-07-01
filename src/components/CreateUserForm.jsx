import React, { useState } from "react";

const CreateUserForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("receptionist");
  const [message, setMessage] = useState("");

  const handleCreateUser = async () => {
    try {
      const res = await fetch('https://firebase-admin-api-7x0i.onrender.com/create-user', { // <-- fixed endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        handleCreateUser();
      }}
      style={{ maxWidth: 400, margin: "2rem auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}
    >
      <h2 style={{ marginBottom: 16 }}>Create User</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        style={{ width: "100%", marginBottom: 12, padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
      >
        <option value="receptionist">Receptionist</option>
        <option value="finance">Finance</option>
        <option value="admin">Admin</option>
      </select>
      <button
        type="submit"
        style={{ width: "100%", padding: 10, background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold" }}
      >
        Create User
      </button>
      {message && (
        <div style={{ marginTop: 16, color: message.startsWith("Error") ? "#dc2626" : "#16a34a" }}>
          {message}
        </div>
      )}
    </form>
  );
};

export default CreateUserForm;
