import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./components/Home";
import MyNfts from "./components/MyNfts";
import User from "./components/User";
import AuthForm from "./components/AuthForm";
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  const isPhantomInstalled = window.phantom?.solana?.isPhantom;
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletStatus, setWalletStatus] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebarOnMobile = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const getProvider = () => {
    if ('phantom' in window) {
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    window.open('https://phantom.app/', '_blank');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
  };

  return (
    <Router>
      <div className="app-container">
        {!isLoggedIn ? (
          <div className="auth-container">
            <AuthForm setIsLoggedIn={setIsLoggedIn} setUserData={setUserData} />
          </div>
        ) : (
          <div className="dashboard-container">
            {/* Overlay for mobile */}
            {isMobile && isSidebarOpen && (
              <div className="sidebar-overlay" onClick={toggleSidebar}></div>
            )}
            
            {/* Sidebar */}
            <div className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
              <div className="sidebar-header">
                <h3 className="mb-0 p-3 text-white">
                  <i className="bi bi-palette me-2"></i>
                  NFT App
                </h3>
                {isMobile && (
                  <button 
                    className="btn btn-link close-sidebar"
                    onClick={toggleSidebar}
                  >
                    <i className="bi bi-x-lg text-white"></i>
                  </button>
                )}
              </div>

              <div className="sidebar-content">
                <div className="nav flex-column">
                  <Link to="/home" className="nav-link" onClick={closeSidebarOnMobile}>
                    <i className="bi bi-house-door me-2"></i>
                    Trang chủ
                  </Link>
                  <Link to="/my-nfts" className="nav-link" onClick={closeSidebarOnMobile}>
                    <i className="bi bi-collection me-2"></i>
                    NFT của tôi
                  </Link>
                  <Link to="/user" className="nav-link" onClick={closeSidebarOnMobile}>
                    <i className="bi bi-person me-2"></i>
                    Người dùng
                  </Link>
                </div>
              </div>

              <div className="sidebar-footer">
                <div className={`wallet-status ${isPhantomInstalled ? 'text-success' : 'text-warning'}`}>
                  <i className={`bi bi-circle-fill me-2`}></i>
                  {isPhantomInstalled ? 'Phantom đã cài đặt' : 'Phantom chưa cài đặt'}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
              {/* Top Navigation */}
              <nav className="top-nav">
                <div className="d-flex align-items-center">
                  <button 
                    className="btn btn-link menu-toggle"
                    onClick={toggleSidebar}
                  >
                    <i className="bi bi-list fs-4"></i>
                  </button>
                </div>
                
                <div className="user-menu dropdown">
                  <button 
                    className="btn btn-link dropdown-toggle"
                    type="button"
                    id="userMenuButton"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="bi bi-person-circle me-2"></i>
                    {userData?.email}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userMenuButton">
                    <li>
                      <Link to="/user" className="dropdown-item">
                        <i className="bi bi-gear me-2"></i>
                        Cài đặt
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Đăng xuất
                      </button>
                    </li>
                  </ul>
                </div>
              </nav>

              {/* Main Content Area */}
              <div className="content-area">
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/my-nfts" element={<MyNfts referenceId={userData?.referenceId} />} />
                  <Route
                    path="/user"
                    element={
                      <User
                        referenceId={userData?.referenceId}
                        email={userData?.email}
                      />
                    }
                  />
                </Routes>
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;