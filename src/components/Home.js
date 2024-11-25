import React, { useEffect, useState } from "react";
import { Connection, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';
import "bootstrap/dist/css/bootstrap.min.css";

const Home = () => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  
  // Khởi tạo connection đến Solana network
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const provider = window.phantom?.solana;
      
      if (provider?.isConnected) {
        const publicKey = provider.publicKey.toString();
        setWalletAddress(publicKey);
        await getWalletBalance(provider.publicKey);
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra kết nối ví:", err);
      setError("Không thể kết nối ví. Vui lòng thử lại.");
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = window.phantom?.solana;
      
      if (!provider?.isPhantom) {
        throw new Error("Vui lòng cài đặt Phantom Wallet!");
      }

      const resp = await provider.connect();
      setWalletAddress(resp.publicKey.toString());
      
      await getWalletBalance(resp.publicKey);
    } catch (err) {
      console.error("Lỗi khi kết nối ví:", err);
      setError(err.message || "Không thể kết nối ví. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const getWalletBalance = async (publicKey) => {
    try {
      const balance = await connection.getBalance(publicKey);
      setBalance(balance / LAMPORTS_PER_SOL);
    } catch (err) {
      console.error("Lỗi khi lấy số dư:", err);
      setError("Không thể lấy số dư ví. Vui lòng thử lại.");
    }
  };

  const disconnectWallet = async () => {
    try {
      const provider = window.phantom?.solana;
      if (provider) {
        await provider.disconnect();
        setWalletAddress(null);
        setBalance(0);
      }
    } catch (err) {
      console.error("Lỗi khi ngắt kết nối ví:", err);
      setError("Không thể ngắt kết nối ví. Vui lòng thử lại.");
    }
  };

  return (
    <div className="container mt-5">
      <header className="text-center mb-5">
        <h1 className="display-4 fw-bold text-primary">Ví Solana của bạn</h1>
        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            {error}
            <button 
              className="btn btn-outline-danger ms-3"
              onClick={connectWallet}
            >
              Thử lại
            </button>
          </div>
        )}
        
        {!walletAddress ? (
          <div className="mt-4">
            <p className="text-muted mb-3">
              Vui lòng kết nối ví Phantom để xem số dư
            </p>
            <button 
              className="btn btn-primary btn-lg"
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Đang kết nối...
                </>
              ) : (
                'Kết nối ví Phantom'
              )}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="card shadow-lg mx-auto" style={{ maxWidth: "500px" }}>
              <div className="card-body">
                <h4 className="card-title mb-4">Thông tin ví</h4>
                <div className="mb-3">
                  <p className="text-muted mb-1">Địa chỉ ví:</p>
                  <p className="font-monospace">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                  </p>
                </div>
                <div className="alert alert-info mb-0">
                  <h3 className="mb-0">
                    Số dư: <span className="fw-bold">{balance.toFixed(2)} SOL</span>
                  </h3>
                </div>
              </div>
              <div className="card-footer bg-transparent">
                <div className="d-flex justify-content-between">
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => getWalletBalance(window.phantom?.solana?.publicKey)}
                  >
                    Làm mới số dư
                  </button>
                  <button 
                    className="btn btn-outline-danger"
                    onClick={disconnectWallet}
                  >
                    Ngắt kết nối
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};

export default Home;