import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey
} from '@solana/web3.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Form, Modal } from 'react-bootstrap';
import { Link, Navigate, NavLink, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import './App.css';
import AccountManagement from "./components/AccountManagement";
import AuthForm from "./components/AuthForm";
import Home from "./components/Home";
// import MyNfts from "./components/MyNfts";
import PurchaseHistory from "./components/PurchaseHistory";
import { UserContext } from './contexts/UserContext';
import { getDatabase, ref, onValue } from "firebase/database";
import AllItems from "./components/AllItems"; // Import AllItems component

// Địa chỉ token USDC chính thức trên Solana devnet
const USDC_MINT_ADDRESS = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

function App() {
  const isPhantomInstalled = window.phantom?.solana?.isPhantom;
  const [userData, setUserData] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);  // eslint-disable-line no-unused-vars
  const [userProfile, setUserProfile] = useState(null); // Added userProfile state

  // Theme state
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) return savedTheme;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Solana connection using useMemo inside the component
  const connection = useMemo(() => new Connection(clusterApiUrl('devnet'), 'confirmed'), []);

  // Wallet state 
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState(null);

  // New states for notification and signing
  const [showNotification, setShowNotification] = useState(false);
  const [showSigningModal, setShowSigningModal] = useState(false);
  const [messageToSign, setMessageToSign] = useState('');
  const [signedMessage, setSignedMessage] = useState(''); // eslint-disable-line no-unused-vars


  // Hàm lấy số dư USDC
  const getUsdcBalance = async (connection, walletPublicKey) => {
    try {
      // Chuyển đổi PublicKey nếu cần
      const publicKey = typeof walletPublicKey === 'string'
        ? new PublicKey(walletPublicKey)
        : walletPublicKey;

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const usdcAccount = tokenAccounts.value.find(
        (account) => account.account.data.parsed.info.mint === USDC_MINT_ADDRESS.toBase58()
      );

      if (usdcAccount) {
        const usdcBalance = usdcAccount.account.data.parsed.info.tokenAmount.uiAmount;
        return usdcBalance || 0;
      }

      return 0; // Không tìm thấy tài khoản USDC
    } catch (error) {
      console.error('Lỗi khi lấy số dư USDC:', error);
      return 0;
    }
  };

  // Hàm fetch số dư USDC
  const fetchUsdcBalance = useCallback(async () => {
    if (walletAddress) {
      try {
        const balance = await getUsdcBalance(connection, walletAddress);
        setUsdcBalance(balance);
      } catch (error) {
        console.error('Lỗi khi lấy số dư USDC:', error);
        setUsdcBalance(0);
      }
    }
  }, [walletAddress, connection]);

  // Theo dõi theme và áp dụng class
  useEffect(() => {
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
  }, [theme]);

  useEffect(() => {
    if (walletAddress) {
      fetchUsdcBalance();
    }
  }, [walletAddress, fetchUsdcBalance]);

  // Hàm thay đổi theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);

    // Phantom Wallet connection status listeners
    const provider = window.phantom?.solana;

    if (provider) {
      const handleConnect = async (publicKey) => {
        console.log('Connected to wallet:', publicKey.toBase58());
        await fetchUsdcBalance();
      };

      const handleDisconnect = () => {
        console.log('Disconnected from wallet');
        setWalletAddress(null);
        setWalletBalance(0);
        setUsdcBalance(null);
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

      // Show notification
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);

      // Show signing modal
      setShowSigningModal(true);

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
        setUsdcBalance(null);
      }
    } catch (err) {
      console.error("Lỗi khi ngắt kết nối ví:", err);
      setWalletError("Không thể ngắt kết nối ví. Vui lòng thử lại.");
    }
  };

  const signMessage = async () => {
    try {
      const provider = window.phantom?.solana;
      if (!provider) throw new Error("Phantom wallet not found!");

      const encodedMessage = new TextEncoder().encode(messageToSign);
      const signedMessage = await provider.signMessage(encodedMessage, "utf8");
      setSignedMessage(JSON.stringify(signedMessage));
      setShowSigningModal(false);
    } catch (error) {
      console.error("Error signing message:", error);
      setWalletError("Không thể ký tin nhắn. Vui lòng thử lại.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
    disconnectWallet();
  };

  useEffect(() => {
    if (isLoggedIn && userData) {
      const db = getDatabase();
      const userRef = ref(db, `account/${userData.referenceId}`);
      onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.val());
        }
      });
    }
  }, [isLoggedIn, userData]); // Added useEffect for fetching user profile

  return (
    <Router>
      <UserContext.Provider value={[userData, setUserData]}>
        <div className={`app-container ${theme}-theme`}>
          {!isLoggedIn ? (
            <div className="auth-container">
              <AuthForm setIsLoggedIn={setIsLoggedIn} setUserData={setUserData} />
            </div>
          ) : (
            <div className="dashboard-container">

              {/* Sidebar */}
              <div className={`sidebar ${!isSidebarOpen ? 'closed' : ''}`}>
                <div className="sidebar-header">
                  <h3 className="mb-0 p-3 text-white">
                    <i className="bi bi-palette me-2"></i>
                    Solana UDPM 11
                  </h3>
                </div>

                <div className="sidebar-content">
                  <div className="nav flex-column">
                    <NavLink
                      to="/home"
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`}

                    >
                      <i className="bi bi-house-door me-2"></i>
                      Trang chủ
                    </NavLink>
                    <NavLink
                      to="/all-items"
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`}
                    >
                      <i className="bi bi-grid me-2"></i>
                      Tất cả sản phẩm
                    </NavLink> {/* Added NavLink for "Tất cả sản phẩm" */}
                    <NavLink
                      to="/purchase-history"
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`}

                    >
                      <i className="bi bi-journal-text me-2"></i>
                      Giao dịch
                    </NavLink>
                    <NavLink
                      to={`/account/${userData?.referenceId}`}
                      className={({ isActive }) =>
                        `nav-link ${isActive ? 'active' : ''}`}

                    >
                      <i className="bi bi-person-circle me-2"></i>
                      Account
                    </NavLink>

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
                <nav className="top-nav fixed-top"> {/* Update 1: Added fixed-top */}
                  <div className="d-flex align-items-center w-100">
                    {/* Nút mở sidebar */}
                    <button
                      className="btn btn-link menu-toggle "
                      onClick={toggleSidebar}
                    >
                      <i className="bi bi-list fs-4"></i>
                    </button>


                    {/* Nút đổi theme */}
                    <button
                      className="btn btn-link theme-toggle ms-auto"
                      onClick={toggleTheme}
                      title="Chuyển chế độ giao diện"
                    >
                      {theme === 'light' ? (
                        <i className="bi bi-moon-stars text-dark"></i>
                      ) : (
                        <i className="bi bi-brightness-high text-warning"></i>
                      )}
                    </button>

                    {/* Hiển thị ví */}
                    <div className="wallet-connection-container d-flex align-items-center ms-3">
                      {!walletAddress ? (
                        <Button
                          variant="outline-primary"
                          onClick={connectWallet}
                          disabled={walletLoading}
                        >
                          {walletLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Đang kết nối...
                            </>
                          ) : (
                            'Connect Phantom'
                          )}
                        </Button>
                      ) : (
                        <div className="d-flex flex-column">
                          <div className="d-flex align-items-center">
                            <span className="me-2 text-muted">
                              SOL:
                              <span className="fw-bold text-dark ms-1">
                                {walletBalance.toFixed(2)} SOL
                              </span>
                            </span>
                            <span className="me-2 text-muted">
                              USDC:
                              <span className="fw-bold text-dark ms-1">
                                {usdcBalance !== null ? usdcBalance.toFixed(2) : 'Đang tải...'} USDC
                              </span>
                            </span>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={disconnectWallet}
                              className="ms-2"
                            >
                              Stop
                            </Button>
                          </div>
                        </div>
                      )}
                      {walletError && (
                        <div className="alert alert-danger mt-2 mb-0 py-1 px-2" role="alert">
                          {walletError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dropdown người dùng */}
                  <Dropdown className="user-dropdown">
                    <Dropdown.Toggle
                      variant="link"
                      id="user-dropdown"
                      className="theme-text d-flex align-items-center text-decoration-none"
                    >
                      {userProfile ? (
                        <div className="d-flex align-items-center">
                          <img
                            src={userProfile.imageUrl || 'https://via.placeholder.com/40'}
                            alt="User Avatar"
                            className="rounded-circle me-2"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                          <span>{userProfile.username || userData.email}</span>
                        </div>
                      ) : (
                        userData?.email
                      )}
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                      <Dropdown.Item as={Link} to="/account">
                        <i className="bi bi-person-circle me-2"></i>
                        Quản lý tài khoản
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
                <div className="content-area ms-4 mt-5 pt-3"> {/* Update 2: Added mt-5 pt-3 */}
                  <Routes>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<Home referenceId={userData?.referenceId} />} />
                    <Route path="/purchase-history" element={<PurchaseHistory referenceId={userData?.referenceId} />} />
                    <Route
                      path="/account"
                      element={<Navigate to={`/account/${userData?.referenceId}`} replace />}
                    />
                    <Route
                      path="/account/:referenceId"
                      element={<AccountManagement />}
                    />
                    <Route path="/all-items" element={<AllItems referenceId={userData?.referenceId} />} /> {/* Added route for AllItems */}
                  </Routes>
                </div>
              </div>
            </div>
          )}
        </div>
      </UserContext.Provider>
      {/* Notification Modal */}
      <Modal show={showNotification} onHide={() => setShowNotification(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Thông báo</Modal.Title>
        </Modal.Header>
        <Modal.Body>Ví Phantom đã được kết nối thành công!</Modal.Body>
      </Modal>

      {/* Signing Modal */}
      <Modal show={showSigningModal} onHide={() => setShowSigningModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Ký tin nhắn</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nhập tin nhắn để ký</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nhập tin nhắn"
                value={messageToSign}
                onChange={(e) => setMessageToSign(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSigningModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={signMessage}>
            Ký tin nhắn
          </Button>
        </Modal.Footer>
      </Modal>
    </Router>
  );
}

export default App;

