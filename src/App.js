import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey
} from '@solana/web3.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useEffect, useState } from "react";
import { Button, Dropdown } from 'react-bootstrap';
import { Link, Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import './App.css';
import AuthForm from "./components/AuthForm";
import Home from "./components/Home";
import MyNfts from "./components/MyNfts";
import User from "./components/User";

// Địa chỉ token USDC chính thức trên Solana devnet
const USDC_MINT_ADDRESS = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

function App() {
  const isPhantomInstalled = window.phantom?.solana?.isPhantom;
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Theme state
  const [theme, setTheme] = useState(() => {
    // Kiểm tra trạng thái theme từ localStorage
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) return savedTheme;

    // Mặc định theo hệ thống
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Wallet state - Thêm state cho USDC
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(null); // State mới cho USDC
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState(null);

  // Solana connection
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // Hàm thay đổi theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  // Theo dõi theme và áp dụng class
  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
  }, [theme]);

  // Hàm fetch số dư USDC
  const fetchUsdcBalance = async () => {
    if (walletAddress) {
      try {
        const publicKey = new PublicKey(walletAddress);
        const balance = await getUsdcBalance(connection, publicKey);
        setUsdcBalance(balance);
      } catch (error) {
        console.error('Lỗi khi lấy số dư USDC:', error);
        setUsdcBalance(null);
      }
    }
  };


  // Hàm lấy số dư USDC
  const getUsdcBalance = async (connection, walletPublicKey) => {
    try {
      // Tìm tài khoản token của ví
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletPublicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      // Tìm tài khoản USDC
      const usdcAccount = tokenAccounts.value.find(
        (account) => account.account.data.parsed.info.mint === USDC_MINT_ADDRESS.toBase58()
      );

      // Trả về số dư USDC
      if (usdcAccount) {
        const usdcBalance = usdcAccount.account.data.parsed.info.tokenAmount.uiAmount;
        return usdcBalance;
      }

      return 0; // Trả về 0 nếu không có tài khoản USDC
    } catch (error) {
      console.error('Lỗi khi lấy số dư USDC:', error);
      return null;
    }
  };


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
      const handleConnect = async (publicKey) => {
        console.log('Connected to wallet:', publicKey.toBase58());
        // Tự động fetch USDC balance khi kết nối
        await fetchUsdcBalance();
      };

      const handleDisconnect = () => {
        console.log('Disconnected from wallet');
        setWalletAddress(null);
        setWalletBalance(0);
        setUsdcBalance(null); // Reset USDC balance
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
  }, [fetchUsdcBalance]);

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

      // Lấy số dư SOL
      await getWalletBalance(publicKey);

      // Lấy số dư USDC
      await fetchUsdcBalance();

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
        setUsdcBalance(null); // Reset USDC balance
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
      <div className={`app-container ${theme}-theme`}>
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
                  {/* Theme Toggle Button */}
                  <button
                    className="btn btn-link theme-toggle ms-3"
                    onClick={toggleTheme}
                    title="Chuyển chế độ giao diện"
                  >
                    {theme === 'light' ? (
                      <i className="bi bi-moon-stars text-dark"></i>
                    ) : (
                      <i className="bi bi-brightness-high text-warning"></i>
                    )}
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
                        Số dư SOL:
                        <span className="fw-bold text-dark ms-1">
                          {walletBalance.toFixed(2)} SOL
                        </span>
                      </span>
                      <span className="me-2 text-muted">
                        Số dư USDC:
                        <span className="fw-bold text-dark ms-1">
                          {usdcBalance !== null ? usdcBalance.toFixed(2) : 'Đang tải...'} USDC
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
                    className="theme-text d-flex align-items-center text-decoration-none "
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
                  <Route path="/home" element={<Home referenceId={userData?.referenceId} />} />
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