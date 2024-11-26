import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { Dropdown, Button } from 'react-bootstrap';
import { Connection, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Wallet state
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState(null);

  // Solana connection
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

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

    // Phantom Wallet connection status listeners
    const provider = window.phantom?.solana;
    
    if (provider) {
      // Listen for connection changes
      const handleConnect = (publicKey) => {
        console.log('Connected to wallet:', publicKey.toBase58());
      };

      const handleDisconnect = () => {
        console.log('Disconnected from wallet');
        setWalletAddress(null);
        setWalletBalance(0);
      };

      provider.on('connect', handleConnect);
      provider.on('disconnect', handleDisconnect);

      // Cleanup listeners and resize event
      return () => {
        window.removeEventListener('resize', handleResize);
        provider.removeListener('connect', handleConnect);
        provider.removeListener('disconnect', handleDisconnect);
      };
    }

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

  const connectWallet = async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const provider = window.phantom?.solana;
      
      if (!provider?.isPhantom) {
        throw new Error("Vui lòng cài đặt Phantom Wallet!");
      }

      // Ensure any existing connection is properly closed
      if (provider.isConnected) {
        await provider.disconnect();
      }

      // Connect with explicit permission
      await provider.connect({ onlyIfTrusted: false });

      const publicKey = provider.publicKey;
      if (!publicKey) {
        throw new Error("Không thể lấy địa chỉ ví. Vui lòng thử lại.");
      }

      setWalletAddress(publicKey.toString());
      
      await getWalletBalance(publicKey);
    } catch (err) {
      console.error("Lỗi khi kết nối ví:", err);
      
      // More specific error handling
      if (err.code === 4001) {
        // User rejected the request
        setWalletError("Kết nối ví bị từ chối. Vui lòng thử lại.");
      } else {
        setWalletError(err.message || "Không thể kết nối ví. Vui lòng thử lại.");
      }
    } finally {
      setWalletLoading(false);
    }
  };

  const getWalletBalance = async (publicKey) => {
    try {
      const balance = await connection.getBalance(publicKey);
      setWalletBalance(balance / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Lỗi khi lấy số dư:", err);
      setWalletError("Không thể lấy số dư ví. Vui lòng thử lại.");
    }
  };

  const disconnectWallet = async () => {
    try {
      const provider = window.phantom?.solana;
      if (provider) {
        await provider.disconnect();
        setWalletAddress(null);
        setWalletBalance(0);
      }
    } catch (err) {
      console.error("Lỗi khi ngắt kết nối ví:", err);
      setWalletError("Không thể ngắt kết nối ví. Vui lòng thử lại.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    disconnectWallet();
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
                  Solana UDPM 11
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
                  <span className="text-white">{isPhantomInstalled ? 'Phantom đã cài đặt' : 'Phantom chưa cài đặt'}</span>
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
                  
                  {/* Wallet Connection Button */}
                  {!walletAddress ? (
                    <Button 
                      variant="outline-primary" 
                      onClick={connectWallet} 
                      disabled={walletLoading}
                      className="ms-3"
                    >
                      {walletLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Đang kết nối...
                        </>
                      ) : (
                        'Kết nối ví Phantom'
                      )}
                    </Button>
                  ) : (
                    <div className="ms-3 d-flex align-items-center">
                      <span className="me-2 text-muted">
                        Số dư: 
                        <span className="fw-bold text-dark ms-1">
                          {walletBalance.toFixed(2)} SOL
                        </span>
                      </span>
                      <Button 
                        variant="outline-danger" 
                        size="sm" 
                        onClick={disconnectWallet}
                      >
                        Ngắt kết nối
                      </Button>
                    </div>
                  )}

                  {walletError && (
                    <div className="alert alert-danger ms-3 mb-0 py-1 px-2" role="alert">
                      {walletError}
                    </div>
                  )}
                </div>
                
                <Dropdown>
                  <Dropdown.Toggle 
                    variant="link" 
                    id="user-dropdown" 
                    className="d-flex align-items-center text-dark text-decoration-none"
                  >
                    <i className="bi bi-person-circle me-2"></i>
                    {userData?.email}
                  </Dropdown.Toggle>

                  <Dropdown.Menu>
                    <Dropdown.Item as={Link} to="/user">
                      <i className="bi bi-gear me-2"></i>
                      Cài đặt
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout} className="text-danger">
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Đăng xuất
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
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