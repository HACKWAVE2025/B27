"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";

import "../styles/admin.css";

const Admin = () => {
  const [activeSection, setActiveSection] = useState("register");
  const [children, setChildren] = useState([]);
  const [registerChild, setRegisterChild] = useState({
    childName: "",
    phone: "",
    userId: "",
  });
  const [editChild, setEditChild] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const socket = io("http://localhost:3000", {
    transports: ["websocket"],
    reconnectionAttempts: 5,
  });

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      console.log("No admin_token, redirecting to /admin-login");
      navigate("/admin-login");
      return;
    }

    fetchChildren(token);

    socket.on("connect", () => console.log("Socket.IO connected"));
    socket.on("connect_error", (err) =>
      console.error("Socket.IO connection error:", err.message)
    );

    socket.on("newChild", ({ parentId, child }) => {
      if (parentId === localStorage.getItem("admin_id")) {
        setChildren((prev) => [child, ...prev]);
      }
    });
    socket.on("childUpdated", ({ parentId, child }) => {
      if (parentId === localStorage.getItem("admin_id")) {
        setChildren((prev) => prev.map((c) => (c._id === child._id ? child : c)));
      }
    });
    socket.on("childDeleted", ({ parentId, childId }) => {
      if (parentId === localStorage.getItem("admin_id")) {
        setChildren((prev) => prev.filter((c) => c._id !== childId));
      }
    });
    socket.on("childStatusUpdated", ({ parentId, child }) => {
      if (parentId === localStorage.getItem("admin_id")) {
        setChildren((prev) => prev.map((c) => (c._id === child._id ? child : c)));
      }
    });

    return () => socket.disconnect();
  }, [navigate]);

  const fetchChildren = async (token) => {
    try {
      const res = await axios.get("http://localhost:3000/admin/children", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Fetched children:", res.data);
      setChildren(res.data);
      setIsLoading(false);
    } catch (error) {
      console.error(
        "Error fetching children:",
        error.response?.data || error.message
      );
      setMessage("Error fetching children");
      setIsLoading(false);
    }
  };

  const handleRegisterChild = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin-login");
      return;
    }
    if (!/^\d{6}$/.test(registerChild.userId)) {
      setMessage("User ID must be a 6-digit number");
      return;
    }
    try {
      const res = await axios.post(
        "http://localhost:3000/admin/register-child",
        {
          ...registerChild,
          password: registerChild.userId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(res.data.message);
      setRegisterChild({ childName: "", phone: "", userId: "" });
      fetchChildren(token);
    } catch (error) {
      console.error(
        "Error registering child:",
        error.response?.data || error.message
      );
      setMessage(error.response?.data?.message || "Registration failed");
    }
  };

  const handleUpdateChild = async () => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.put(
        `http://localhost:3000/admin/children/${editChild._id}/edit`,
        {
          childName: editChild.childName,
          phone: editChild.phone,
          userId: editChild.userId,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(res.data.message);
      setEditChild(null);
      fetchChildren(token);
      setActiveSection("listOfChildren");
    } catch (error) {
      console.error(
        "Error updating child:",
        error.response?.data || error.message
      );
      setMessage(error.response?.data?.message || "Update failed");
    }
  };

  const handleResetPassword = async (childId) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.post(
        `http://localhost:3000/admin/children/${childId}/reset-password`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(
        `Password reset. Temporary password: ${res.data.temporaryPassword}`
      );
    } catch (error) {
      console.error(
        "Error resetting password:",
        error.response?.data || error.message
      );
      setMessage(error.response?.data?.message || "Reset failed");
    }
  };

  const handleToggleStatus = async (childId, isActive) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.patch(
        `http://localhost:3000/admin/children/${childId}/status`,
        { isActive: !isActive },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(res.data.message);
      fetchChildren(token);
    } catch (error) {
      console.error(
        "Error updating status:",
        error.response?.data || error.message
      );
      setMessage(error.response?.data?.message || "Status update failed");
    }
  };

  const handleDeleteChild = async (childId) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.delete(
        `http://localhost:3000/admin/children/${childId}/delete`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setMessage(res.data.message);
      fetchChildren(token);
    } catch (error) {
      console.error(
        "Error deleting child:",
        error.response?.data || error.message
      );
      setMessage(error.response?.data?.message || "Deletion failed");
    }
  };

  if (isLoading) {
    return <div className="admin-container">Loading...</div>;
  }

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <button onClick={() => setActiveSection("register")}>Register</button>
        <button onClick={() => setActiveSection("listOfChildren")}>
          List of Children
        </button>
        <button onClick={() => setActiveSection("update")}>Update</button>
        <button onClick={() => setActiveSection("delete")}>Delete</button>
      </nav>
      <h1>Admin Panel</h1>
      {message && <p className="message">{message}</p>}

      <div className="admin-content">
        {activeSection === "register" && (
          <div className="child-registration">
            <h2>Register New Child</h2>
            <form onSubmit={handleRegisterChild}>
              <input
                type="text"
                placeholder="Child Name"
                value={registerChild.childName}
                onChange={(e) =>
                  setRegisterChild({
                    ...registerChild,
                    childName: e.target.value,
                  })
                }
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={registerChild.phone}
                onChange={(e) =>
                  setRegisterChild({ ...registerChild, phone: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="6-Digit User ID"
                value={registerChild.userId}
                onChange={(e) =>
                  setRegisterChild({ ...registerChild, userId: e.target.value })
                }
                required
              />
              <button type="submit">Register Child</button>
            </form>
          </div>
        )}

        {activeSection === "listOfChildren" && (
          <div className="child-list">
            <h2>Registered Children</h2>
            {children.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>User ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((child) => (
                    <tr key={child._id}>
                      <td>{child.childName}</td>
                      <td>{child.phone}</td>
                      <td>{child.userId}</td>
                      <td>{child.isActive ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No children registered yet.</p>
            )}
          </div>
        )}

        {activeSection === "update" && (
          <div className="edit-child">
            <h2>Update Child</h2>
            <div className="child-selector">
              <select
                value={editChild ? editChild._id : ""}
                onChange={(e) => {
                  const child = children.find((c) => c._id === e.target.value);
                  setEditChild(child || null);
                }}
              >
                <option value="">Select a child</option>
                {children.map((child) => (
                  <option key={child._id} value={child._id}>
                    {child.childName} ({child.userId})
                  </option>
                ))}
              </select>
            </div>
            {editChild && (
              <>
                <input
                  type="text"
                  value={editChild.childName || ""}
                  onChange={(e) =>
                    setEditChild({ ...editChild, childName: e.target.value })
                  }
                  placeholder="Child Name"
                />
                <input
                  type="text"
                  value={editChild.phone || ""}
                  onChange={(e) =>
                    setEditChild({ ...editChild, phone: e.target.value })
                  }
                  placeholder="Phone"
                />
                <input
                  type="text"
                  value={editChild.userId || ""}
                  onChange={(e) =>
                    setEditChild({ ...editChild, userId: e.target.value })
                  }
                  placeholder="User ID"
                />
                <button onClick={handleUpdateChild}>Update Details</button>
                <button onClick={() => handleResetPassword(editChild._id)}>
                  Reset Password
                </button>
                <button
                  onClick={() =>
                    handleToggleStatus(editChild._id, editChild.isActive)
                  }
                >
                  {editChild.isActive ? "Deactivate" : "Activate"}
                </button>
                <button onClick={() => setEditChild(null)}>Cancel</button>
              </>
            )}
            {!editChild && <p>Please select a child to update.</p>}
          </div>
        )}

        {activeSection === "delete" && (
          <div className="child-list">
            <h2>Delete Children</h2>
            {children.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>User ID</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((child) => (
                    <tr key={child._id}>
                      <td>{child.childName}</td>
                      <td>{child.phone}</td>
                      <td>{child.userId}</td>
                      <td>{child.isActive ? "Active" : "Inactive"}</td>
                      <td>
                        <button onClick={() => handleDeleteChild(child._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No children to delete.</p>
            )}
          </div>
        )}
      </div>

      <div className="footer">
        <button
          onClick={() => {
            localStorage.removeItem("admin_token");
            localStorage.removeItem("admin_id");
            navigate("/admin-login");
          }}
          className="back-btn"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Admin;