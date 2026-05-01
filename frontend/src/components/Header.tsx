import React from "react";
import "./Header.css";

interface HeaderProps {
  balance: number;
  username: string;
}

const Header: React.FC<HeaderProps> = ({ balance, username }) => {
  return (
    <header className="header">
      <div className="header__logo">
        <span className="header__logo-icon">⚡</span>
        <h1 className="header__title">FixLab Prediction</h1>
      </div>
      <div className="header__user">
        <span className="header__username">{username}</span>
        <div className="header__balance">
          <span className="header__balance-label">Balance</span>
          <span className="header__balance-value">₹{balance.toFixed(2)}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
