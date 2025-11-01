import React from "react";
import "../styles/Childbutton.css";

const HandDrawnAdminButton = () => {
  const handleClick = () => {
    window.location.href = "/";
  };

  return (
    <div className="child-box-button" onClick={handleClick}>
      <div className="button">
        <span>Child Login</span>
      </div>
    </div>
  );
};

export default HandDrawnAdminButton;
