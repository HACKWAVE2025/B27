import React from "react";
import "../styles/SuperAdminButton.css";

const HandDrawnAdminButton = () => {
  const handleClick = () => {
    window.location.href = "/superadmin-login";
  };

  return (
    <div className="superadmin-box-button" onClick={handleClick}>
      <div className="button">
        <span>SuperAdmin Login</span>
      </div>
    </div>
  );
};

export default HandDrawnAdminButton;
