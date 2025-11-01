import React from "react";
import "../styles/handdrawnadminbutton.css";

const HandDrawnAdminButton = () => {
  const handleClick = () => {
    window.location.href = "/admin-login";
  };

  return (
    <div className="admin-box-button" onClick={handleClick}>
      <div className="button">
        <span>Admin Login</span>
      </div>
    </div>
  );
};

export default HandDrawnAdminButton;
