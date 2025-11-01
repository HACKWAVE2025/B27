"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import Chart from "chart.js/auto"; // Re-imported Chart.js

import "../styles/admin.css";

// Helper component for the tabs in the manage modal
const TabButton = ({ label, isActive, onClick }) => (
  <button
    className={`tab-button ${isActive ? "active" : ""}`}
    onClick={onClick}
  >
    {label}
  </button>
);

const Admin = () => {
  const [children, setChildren] = useState([]);
  const [registerChild, setRegisterChild] = useState({
    childName: "",
    phone: "",
    userId: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- State for Modals and Management ---
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [managingChild, setManagingChild] = useState(null); // Holds the child object
  const [modalTab, setModalTab] = useState("details"); // 'details', 'notes', 'actions', 'reports'

  // --- State for "Update" tab ---
  const [editFormData, setEditFormData] = useState({
    _id: "",
    childName: "",
    phone: "",
    userId: "",
  });

  // --- State for "Notes" tab ---
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [isFetchingNotes, setIsFetchingNotes] = useState(false);

  // --- NEW: State for "Reports" tab ---
  const [emotionTrends, setEmotionTrends] = useState([]);
  const [gameReports, setGameReports] = useState([]);
  const [isFetchingReports, setIsFetchingReports] = useState(false);

  // --- NEW: Chart Refs ---
  const emotionTrendsChartRef = useRef(null);
  const emotionDistributionChartRef = useRef(null);
  const gamePerformanceChartRef = useRef(null);
  const emotionTrendsChartInstance = useRef(null);
  const emotionDistributionChartInstance = useRef(null);
  const gamePerformanceChartInstance = useRef(null);

  const navigate = useNavigate();
  const socket = io("http://localhost:3000", {
    transports: ["websocket"],
    reconnectionAttempts: 5,
  });

  // --- Socket.IO Listeners ---
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
        setChildren((prev) =>
          [child, ...prev].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
      }
    });
    socket.on("childUpdated", ({ parentId, child }) => {
      if (parentId === localStorage.getItem("admin_id")) {
        setChildren((prev) =>
          prev.map((c) => (c._id === child._id ? child : c))
        );
        if (managingChild && managingChild._id === child._id) {
          setManagingChild(child);
          setEditFormData({
            _id: child._id,
            childName: child.childName,
            phone: child.phone,
            userId: child.userId,
          });
        }
      }
    });
    socket.on("childDeleted", ({ parentId, childId }) => {
      if (parentId === localStorage.getItem("admin_id")) {
        setChildren((prev) => prev.filter((c) => c._id !== childId));
        if (managingChild && managingChild._id === childId) {
          setManagingChild(null);
        }
      }
    });
    socket.on("childStatusUpdated", ({ parentId, child }) => {
      if (parentId === localStorage.getItem("admin_id")) {
        setChildren((prev) =>
          prev.map((c) => (c._id === child._id ? child : c))
        );
        if (managingChild && managingChild._id === child._id) {
          setManagingChild(child);
        }
      }
    });

    // --- NEW: Real-time report updates ---
    socket.on(
      "emotionUpdate",
      ({ parentId, userId, emotion, question, timestamp }) => {
        if (
          parentId === localStorage.getItem("admin_id") &&
          managingChild &&
          userId === managingChild.userId
        ) {
          setEmotionTrends((prev) => [
            ...prev,
            { emotion, question, timestamp },
          ]);
        }
      }
    );
    socket.on(
      "gameReportUpdate",
      ({ parentId, userId, score, emotions, question, isCorrect, completedAt }) => {
        if (
          parentId === localStorage.getItem("admin_id") &&
          managingChild &&
          userId === managingChild.userId
        ) {
          setGameReports((prev) => [
            ...prev,
            { score, emotions, question, isCorrect, completedAt },
          ]);
        }
      }
    );

    return () => socket.disconnect();
  }, [navigate, managingChild]);

  // --- NEW: useEffect to draw charts when tab is active ---
  useEffect(() => {
    if (modalTab === "reports" && managingChild) {
      // Small delay to allow modal canvas to render
      const timer = setTimeout(() => {
        updateEmotionCharts(emotionTrends);
        updateGamePerformanceChart(gameReports);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalTab, emotionTrends, gameReports, managingChild]);

  // --- NEW: useEffect for chart cleanup ---
  useEffect(() => {
    return () => {
      if (emotionTrendsChartInstance.current) {
        emotionTrendsChartInstance.current.destroy();
      }
      if (emotionDistributionChartInstance.current) {
        emotionDistributionChartInstance.current.destroy();
      }
      if (gamePerformanceChartInstance.current) {
        gamePerformanceChartInstance.current.destroy();
      }
    };
  }, []);

  // --- NEW: `useMemo` for Report Stats ---
  const summaryStats = useMemo(() => {
    if (!managingChild || (!emotionTrends.length && !gameReports.length)) {
      return {
        avgScore: 0,
        totalGames: 0,
        accuracy: 0,
        mostCommonEmotion: "N/A",
      };
    }

    // Game stats
    const totalGames = gameReports.length;
    const totalScore = gameReports.reduce((acc, report) => acc + report.score, 0);
    const avgScore = totalGames > 0 ? totalScore / totalGames : 0;
    const totalCorrect = gameReports.filter((report) => report.isCorrect).length;
    const accuracy = totalGames > 0 ? (totalCorrect / totalGames) * 100 : 0;

    // Emotion stats
    const emotionCounts = emotionTrends.reduce((acc, trend) => {
      acc[trend.emotion] = (acc[trend.emotion] || 0) + 1;
      return acc;
    }, {});

    let mostCommonEmotion = "N/A";
    let maxCount = 0;
    for (const emotion in emotionCounts) {
      if (emotionCounts[emotion] > maxCount) {
        maxCount = emotionCounts[emotion];
        mostCommonEmotion = emotion;
      }
    }

    return {
      avgScore: avgScore.toFixed(1),
      totalGames,
      accuracy: accuracy.toFixed(1),
      mostCommonEmotion,
    };
  }, [emotionTrends, gameReports, managingChild]);

  // --- NEW: `useMemo` for Child Name ---
  const managingChildName = useMemo(() => {
    return managingChild ? managingChild.childName : "";
  }, [managingChild]);

  // --- Data Fetching Functions ---
  const fetchChildren = async (token) => {
    try {
      const res = await axios.get("http://localhost:3000/admin/children", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChildren(
        res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
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

  // --- NEW: Report Fetching Functions ---
  const fetchEmotionTrends = async (userId) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.get(
        `http://localhost:3000/child/emotion-trends/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEmotionTrends(res.data || []);
    } catch (error) {
      console.error("Error fetching emotion trends:", error.response?.data || error.message);
      setEmotionTrends([]);
    }
  };

  const fetchGameReport = async (userId) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.get(
        `http://localhost:3000/child/game-reports/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setGameReports(res.data || []);
    } catch (error) {
      console.error("Error fetching game reports:", error.response?.data || error.message);
      setGameReports([]);
    }
  };

  // --- Modal Opener/Closer Functions ---
  const handleOpenManageModal = async (child) => {
    setManagingChild(child);
    setEditFormData({
      _id: child._id,
      childName: child.childName,
      phone: child.phone,
      userId: child.userId,
    });
    setModalTab("details"); // Reset to first tab

    // Fetch all data for this child
    setIsFetchingNotes(true);
    setIsFetchingReports(true);

    // Run fetches in parallel
    await Promise.all([
      fetchNotes(child._id),
      fetchEmotionTrends(child.userId),
      fetchGameReport(child.userId),
    ]);

    setIsFetchingNotes(false);
    setIsFetchingReports(false);
  };

  const handleCloseManageModal = () => {
    setManagingChild(null);
    setMessage("");
    // Clear all modal data
    setNotes([]);
    setNewNote("");
    setEmotionTrends([]);
    setGameReports([]);
  };

  const handleOpenRegisterModal = () => {
    setRegisterChild({ childName: "", phone: "", userId: "" });
    setIsRegisterModalOpen(true);
  };

  const handleCloseRegisterModal = () => {
    setIsRegisterModalOpen(false);
    setMessage("");
  };

  // --- Notes Functions ---
  const fetchNotes = async (childId) => {
    setIsFetchingNotes(true);
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.get(
        `http://localhost:3000/admin/child/${childId}/notes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotes(
        res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    } catch (error) {
      console.error("Error fetching notes:", error.response?.data || error.message);
      setNotes([]);
    }
    setIsFetchingNotes(false);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.post(
        `http://localhost:3000/admin/child/${managingChild._id}/notes`,
        { text: newNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes([res.data, ...notes]);
      setNewNote("");
      setMessage("Note saved.");
    } catch (error) {
      console.error("Error saving note:", error.response?.data || error.message);
      setMessage("Failed to save note.");
    }
  };

  // --- Action Handlers ---
  const handleRegisterChild = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    if (!/^\d{6}$/.test(registerChild.userId)) {
      setMessage("User ID must be a 6-digit number");
      return;
    }
    try {
      const res = await axios.post(
        "http://localhost:3000/admin/register-child",
        { ...registerChild, password: registerChild.userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
      handleCloseRegisterModal();
    } catch (error) {
      console.error("Error registering child:", error.response?.data || error.message);
      setMessage(error.response?.data?.message || "Registration failed");
    }
  };

  const handleUpdateChild = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.put(
        `http://localhost:3000/admin/children/${editFormData._id}/edit`,
        {
          childName: editFormData.childName,
          phone: editFormData.phone,
          userId: editFormData.userId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
    } catch (error) {
      console.error("Error updating child:", error.response?.data || error.message);
      setMessage(error.response?.data?.message || "Update failed");
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetPassword = async (childId) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.post(
        `http://localhost:3000/admin/children/${childId}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`Password reset. Temporary password: ${res.data.temporaryPassword}`);
    } catch (error) {
      console.error("Error resetting password:", error.response?.data || error.message);
      setMessage(error.response?.data?.message || "Reset failed");
    }
  };

  const handleToggleStatus = async (childId, isActive) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.patch(
        `http://localhost:3000/admin/children/${childId}/status`,
        { isActive: !isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
    } catch (error) {
      console.error("Error updating status:", error.response?.data || error.message);
      setMessage(error.response?.data?.message || "Status update failed");
    }
  };

  const handleDeleteChild = async (childId) => {
    if (!window.confirm("Are you sure you want to delete this child permanently?")) {
      return;
    }
    const token = localStorage.getItem("admin_token");
    try {
      const res = await axios.delete(
        `http://localhost:3000/admin/children/${childId}/delete`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(res.data.message);
      handleCloseManageModal();
    } catch (error) {
      console.error("Error deleting child:", error.response?.data || error.message);
      setMessage(error.response?.data?.message || "Deletion failed");
    }
  };

  // --- NEW: Chart Drawing Functions ---
  const updateEmotionCharts = (data) => {
    if (!data || !emotionTrendsChartRef.current || !emotionDistributionChartRef.current)
      return;
    updateEmotionTrendsChart(data);
    updateEmotionDistributionChart(data);
  };

  const updateEmotionTrendsChart = (data) => {
    const timestamps = [];
    const emotions = {};
    const emotionCounts = {};
    data.forEach((item) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      if (!timestamps.includes(date)) timestamps.push(date);
      if (!emotions[item.emotion]) {
        emotions[item.emotion] = [];
        emotionCounts[item.emotion] = {};
      }
      if (!emotionCounts[item.emotion][date]) {
        emotionCounts[item.emotion][date] = 0;
      }
      emotionCounts[item.emotion][date]++;
    });
    timestamps.sort((a, b) => new Date(a) - new Date(b));
    const datasets = Object.keys(emotions).map((emotion) => {
      const emotionData = timestamps.map(
        (date) => emotionCounts[emotion][date] || 0
      );
      let color;
      switch (emotion.toLowerCase()) {
        case "happy": color = "rgba(75, 192, 192, 0.7)"; break;
        case "sad": color = "rgba(54, 162, 235, 0.7)"; break;
        case "angry": color = "rgba(255, 99, 132, 0.7)"; break;
        case "neutral": color = "rgba(201, 203, 207, 0.7)"; break;
        default:
          const r = Math.floor(Math.random() * 255);
          const g = Math.floor(Math.random() * 255);
          const b = Math.floor(Math.random() * 255);
          color = `rgba(${r}, ${g}, ${b}, 0.7)`;
      }
      return {
        label: emotion,
        data: emotionData,
        borderColor: color,
        backgroundColor: color.replace("0.7", "0.2"),
        tension: 0.4,
        fill: true,
      };
    });

    if (emotionTrendsChartInstance.current) {
      emotionTrendsChartInstance.current.destroy();
    }
    const ctx = emotionTrendsChartRef.current.getContext("2d");
    emotionTrendsChartInstance.current = new Chart(ctx, {
      type: "line",
      data: { labels: timestamps, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          title: { display: true, text: "Emotion Trends Over Time", font: { size: 16, weight: "bold" } },
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Frequency" } },
          x: { title: { display: true, text: "Date" } },
        },
      },
    });
  };

  const updateEmotionDistributionChart = (data) => {
    const emotionCounts = {};
    data.forEach((item) => {
      if (!emotionCounts[item.emotion]) emotionCounts[item.emotion] = 0;
      emotionCounts[item.emotion]++;
    });
    const emotions = Object.keys(emotionCounts);
    const counts = emotions.map((emotion) => emotionCounts[emotion]);
    const backgroundColors = emotions.map((emotion) => {
      switch (emotion.toLowerCase()) {
        case "happy": return "rgba(75, 192, 192, 0.7)";
        case "sad": return "rgba(54, 162, 235, 0.7)";
        case "angry": return "rgba(255, 99, 132, 0.7)";
        case "neutral": return "rgba(201, 203, 207, 0.7)";
        default:
          const r = Math.floor(Math.random() * 255);
          const g = Math.floor(Math.random() * 255);
          const b = Math.floor(Math.random() * 255);
          return `rgba(${r}, ${g}, ${b}, 0.7)`;
      }
    });

    if (emotionDistributionChartInstance.current) {
      emotionDistributionChartInstance.current.destroy();
    }
    const ctx = emotionDistributionChartRef.current.getContext("2d");
    emotionDistributionChartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: emotions,
        datasets: [{
          data: counts,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map((color) => color.replace("0.7", "1")),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right" },
          title: { display: true, text: "Emotion Distribution", font: { size: 16, weight: "bold" } },
        },
      },
    });
  };

  const updateGamePerformanceChart = (data) => {
    if (!data || data.length === 0 || !gamePerformanceChartRef.current) return;

    const dates = [];
    const scores = [];
    const correctAnswers = [];
    const incorrectAnswers = [];
    const groupedData = {};
    data.forEach((item) => {
      const date = new Date(item.completedAt).toLocaleDateString();
      if (!groupedData[date]) {
        groupedData[date] = { scores: [], correct: 0, incorrect: 0 };
      }
      groupedData[date].scores.push(item.score);
      if (item.isCorrect) groupedData[date].correct++;
      else groupedData[date].incorrect++;
    });
    Object.keys(groupedData).sort((a, b) => new Date(a) - new Date(b)).forEach((date) => {
      dates.push(date);
      const avgScore = groupedData[date].scores.reduce((sum, score) => sum + score, 0) / groupedData[date].scores.length;
      scores.push(avgScore);
      correctAnswers.push(groupedData[date].correct);
      incorrectAnswers.push(groupedData[date].incorrect);
    });

    if (gamePerformanceChartInstance.current) {
      gamePerformanceChartInstance.current.destroy();
    }
    const ctx = gamePerformanceChartRef.current.getContext("2d");
    gamePerformanceChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Average Score",
            data: scores,
            backgroundColor: "rgba(75, 192, 192, 0.7)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
            type: "line",
            yAxisID: "y",
            tension: 0.4,
          },
          {
            label: "Correct Answers",
            data: correctAnswers,
            backgroundColor: "rgba(54, 162, 235, 0.7)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 1,
            yAxisID: "y1",
          },
          {
            label: "Incorrect Answers",
            data: incorrectAnswers,
            backgroundColor: "rgba(255, 99, 132, 0.7)",
            borderColor: "rgba(255, 99, 132, 1)",
            borderWidth: 1,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top" },
          title: { display: true, text: "Game Performance", font: { size: 16, weight: "bold" } },
        },
        scales: {
          y: { type: "linear", display: true, position: "left", title: { display: true, text: "Score" }, min: 0, max: 100 },
          y1: { type: "linear", display: true, position: "right", title: { display: true, text: "Count" }, min: 0, grid: { drawOnChartArea: false } },
        },
      },
    });
  };

  // --- Main Render ---
  if (isLoading) {
    return <div className="admin-container">Loading...</div>;
  }

  return (
    <div className="admin-container">
      <h1>Admin Panel</h1>
      {message && <p className="message">{message}</p>}

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Children</h3>
          <p>{children.length}</p>
        </div>
        <div className="stat-card">
          <h3>Active</h3>
          <p>{children.filter((c) => c.isActive).length}</p>
        </div>
        <div className="stat-card">
          <h3>Inactive</h3>
          <p>{children.filter((c) => !c.isActive).length}</p>
        </div>
      </div>

      <div className="child-list-container">
        <div className="child-list-header">
          <h2>Registered Children</h2>
          <button className="btn-primary" onClick={handleOpenRegisterModal}>
            + Add New Child
          </button>
        </div>
        <div className="child-list">
          {children.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>User ID</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {children.map((child) => (
                  <tr key={child._id}>
                    <td>{child.childName}</td>
                    <td>{child.userId}</td>
                    <td>{child.phone}</td>
                    <td>
                      <span className={`status-badge ${child.isActive ? "active" : "inactive"}`}>
                        {child.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button className="btn-secondary" onClick={() => handleOpenManageModal(child)}>
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No children registered yet.</p>
          )}
        </div>
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

      {/* --- MODALS --- */}

      {/* Register Child Modal */}
      {isRegisterModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close-btn" onClick={handleCloseRegisterModal}>&times;</button>
            <h2>Register New Child</h2>
            {message && <p className="message">{message}</p>}
            <form onSubmit={handleRegisterChild} className="modal-form">
              <input
                type="text"
                placeholder="Child Name"
                value={registerChild.childName}
                onChange={(e) => setRegisterChild({ ...registerChild, childName: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={registerChild.phone}
                onChange={(e) => setRegisterChild({ ...registerChild, phone: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="6-Digit User ID"
                value={registerChild.userId}
                onChange={(e) => setRegisterChild({ ...registerChild, userId: e.target.value })}
                required
              />
              <button type="submit" className="btn-primary">Register Child</button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Child Modal */}
      {managingChild && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <button className="modal-close-btn" onClick={handleCloseManageModal}>&times;</button>
            <h2>Manage: {managingChild.childName}</h2>
            <p className="modal-subtitle">User ID: {managingChild.userId}</p>

            {message && <p className="message">{message}</p>}

            <div className="modal-tabs">
              <TabButton label="Details" isActive={modalTab === "details"} onClick={() => setModalTab("details")} />
              <TabButton label="Notes" isActive={modalTab === "notes"} onClick={() => setModalTab("notes")} />
              {/* --- NEW: Reports Tab Button --- */}
              <TabButton label="Reports" isActive={modalTab === "reports"} onClick={() => setModalTab("reports")} />
              <TabButton label="Actions" isActive={modalTab === "actions"} onClick={() => setModalTab("actions")} />
            </div>

            <div className="modal-tab-content">
              {/* Details (Update) Tab */}
              {modalTab === "details" && (
                <form onSubmit={handleUpdateChild} className="modal-form">
                  <label>Child Name</label>
                  <input
                    type="text"
                    name="childName"
                    value={editFormData.childName}
                    onChange={handleEditFormChange}
                    placeholder="Child Name"
                  />
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={editFormData.phone}
                    onChange={handleEditFormChange}
                    placeholder="Phone"
                  />
                  <label>User ID (6 Digits)</label>
                  <input
                    type="text"
                    name="userId"
                    value={editFormData.userId}
                    onChange={handleEditFormChange}
                    placeholder="User ID"
                  />
                  <button type="submit" className="btn-primary">Save Changes</button>
                </form>
              )}

              {/* Notes Tab */}
              {modalTab === "notes" && (
                <div className="notes-section">
                  <form onSubmit={handleAddNote} className="notes-form">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Write a private note about this child..."
                    />
                    <button type="submit" className="btn-primary">Save Note</button>
                  </form>
                  <div className="notes-list">
                    {isFetchingNotes ? (
                      <p>Loading notes...</p>
                    ) : notes.length > 0 ? (
                      notes.map((note) => (
                        <div key={note._id} className="note-item">
                          <p>{note.text}</p>
                          <span>
                            <strong>{note.adminName || "Admin"}</strong> @{" "}
                            {new Date(note.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p>No notes for this child yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* --- NEW: Reports Tab Content --- */}
              {modalTab === "reports" && (
                <div className="reports-section">
                  {isFetchingReports ? (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <p>Loading reports...</p>
                    </div>
                  ) : (
                    <div className="reports-grid">
                      <div className="reports-kpi-row">
                        <div className="kpi-card">
                          <h3>Total Games Played</h3>
                          <p>{summaryStats.totalGames}</p>
                        </div>
                        <div className="kpi-card">
                          <h3>Average Score</h3>
                          <p>{summaryStats.avgScore}%</p>
                        </div>
                        <div className="kpi-card">
                          <h3>Overall Accuracy</h3>
                          <p>{summaryStats.accuracy}%</p>
                        </div>
                        <div className="kpi-card">
                          <h3>Dominant Emotion</h3>
                          <p>{summaryStats.mostCommonEmotion}</p>
                        </div>
                      </div>

                      <div className="chart-card report-summary-card">
                        <h2>Executive Summary</h2>
                        {summaryStats.totalGames > 0 ? (
                          <p>
                            <strong>{managingChildName}</strong> has completed{" "}
                            <strong>{summaryStats.totalGames}</strong> game sessions
                            with an average score of{" "}
                            <strong>{summaryStats.avgScore}%</strong> and an overall
                            accuracy of <strong>{summaryStats.accuracy}%</strong>. The
                            most frequently observed emotion has been{" "}
                            <strong>{summaryStats.mostCommonEmotion}</strong>.
                          </p>
                        ) : (
                          <p>
                            No report data found for {managingChildName} yet.
                          </p>
                        )}
                      </div>

                      <div className="chart-card emotion-trends-chart">
                        <div className="chart-container">
                          <canvas ref={emotionTrendsChartRef}></canvas>
                        </div>
                      </div>

                      <div className="chart-card emotion-distribution-chart">
                        <div className="chart-container">
                          <canvas ref={emotionDistributionChartRef}></canvas>
                        </div>
                      </div>

                      <div className="chart-card game-performance-chart">
                        <div className="chart-container">
                          <canvas ref={gamePerformanceChartRef}></canvas>
                        </div>
                      </div>

                      <div className="chart-card recent-reports">
                        <h2>Recent Game Reports</h2>
                        <div className="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Question</th>
                                <th>Result</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gameReports.slice(-5).reverse().map((report, index) => (
                                <tr key={index}>
                                  <td>{new Date(report.completedAt).toLocaleDateString()}</td>
                                  <td>{report.score}</td>
                                  <td>{report.question}</td>
                                  <td className={report.isCorrect ? "correct" : "incorrect"}>
                                    {report.isCorrect ? "Correct" : "Incorrect"}
                                  </td>
                                </tr> 
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {modalTab === "actions" && (
                <div className="snapshot-actions">
                  <button
                    className="btn-action btn-status"
                    onClick={() =>
                      handleToggleStatus(managingChild._id, managingChild.isActive)
                    }
                  >
                    {managingChild.isActive ? "Deactivate Account" : "Activate Account"}
                  </button>
                  <button
                    className="btn-action btn-reset"
                    onClick={() => handleResetPassword(managingChild._id)}
                  >
                    Reset Password
                  </button>
                  <button
                    className="btn-action btn-delete"
                    onClick={() => handleDeleteChild(managingChild._id)}
                  >
                    Delete Child Permanently
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;