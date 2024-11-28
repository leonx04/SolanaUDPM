import axios from 'axios';
import 'driver.js/dist/driver.css';
import React, { useEffect, useState } from 'react';
import { driver as Driver } from 'driver.js';
import { apiKey } from '../api';
import unidecode from 'unidecode';

const apiBaseUrl = "https://api.gameshift.dev/nx/users";

const AuthForm = ({ setIsLoggedIn, setUserData }) => {
  // Trạng thái quản lý dữ liệu biểu mẫu
  const [formData, setFormData] = useState({
    referenceId: '',  // Mã định danh duy nhất của người dùng
    email: '',        // Địa chỉ email để xác thực
    externalWalletAddress: ''  // Địa chỉ ví Solana khi đăng ký
  });

  // Các trạng thái quản lý giao diện và logic
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);

  // Kiểm tra và khởi tạo hướng dẫn khi component được tải
  useEffect(() => {
    const checkPhantomWallet = () => {
      const { solana } = window;
      setIsPhantomInstalled(!!(solana && solana.isPhantom));
    };

    checkPhantomWallet();
    initializeDriverGuide();
  }, []);

  // Hàm khởi tạo hướng dẫn từng bước
  const initializeDriverGuide = () => {
    const driver = new Driver({
      animate: true,
      opacity: 0.75,
      nextBtnText: 'Tiếp theo',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Hoàn tất',
      steps: [
        {
          element: '#referenceId-input',
          popover: {
            title: 'Tên tải khoản',
            description: 'Nhập tên tài khoản duy nhất. Đây là thông tin định danh tài khoản của bạn trong hệ thống.',
            position: 'bottom'
          }
        },
        {
          element: '#email-input',
          popover: {
            title: 'Email',
            description: 'Điền địa chỉ email chính xác. Email này sẽ được sử dụng để xác thực và khôi phục tài khoản.',
            position: 'bottom'
          }
        },
        {
          element: '#auth-button',
          popover: {
            title: 'Xác thực Tài khoản',
            description: 'Nhấn nút để hoàn tất quá trình đăng ký hoặc đăng nhập. Lưu ý đăng ký cần kết nối Phantom Wallet.',
            position: 'top'
          }
        }
      ]
    });

    // Tự động bắt đầu hướng dẫn khi trang được tải
    driver.drive();
  };

  // Kết nối với Phantom Wallet
  const connectPhantomWallet = async () => {
    if (!isPhantomInstalled) {
      setErrorMessage('Phantom Wallet chưa được cài đặt');
      return null;
    }

    try {
      const resp = await window.solana.connect();
      return resp.publicKey.toString();
    } catch (err) {
      setErrorMessage('Kết nối ví Phantom thất bại');
      return null;
    }
  };

  // Cập nhật trạng thái form khi người dùng thay đổi giá trị
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedValue = unidecode(value);  // Sử dụng unidecode để loại bỏ dấu

    setFormData(prev => ({
      ...prev,
      [name]: updatedValue
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Xác thực dữ liệu biểu mẫu
  const validateForm = () => {
    if (!formData.referenceId || !formData.email) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin.');
      return false;
    }
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrorMessage('Email không hợp lệ.');
      return false;
    }
    return true;
  };

  // Xử lý hành động đăng ký hoặc đăng nhập
  const handleAction = async (isRegister) => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isRegister) {
        // Quy trình đăng ký chi tiết
        const walletAddress = await connectPhantomWallet();
        if (!walletAddress) {
          setIsLoading(false);
          return;
        }

        // Cập nhật địa chỉ ví vào form
        setFormData(prev => ({
          ...prev,
          externalWalletAddress: walletAddress
        }));

        const config = {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': apiKey
          }
        };

        // Gửi yêu cầu đăng ký
        await axios.post(apiBaseUrl, {
          referenceId: formData.referenceId,
          email: formData.email,
          externalWalletAddress: walletAddress
        }, config);

        setSuccessMessage('Đăng ký thành công!');
      } else {
        // Quy trình đăng nhập
        const config = {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey
          }
        };

        const response = await axios.get(`${apiBaseUrl}/${formData.referenceId}`, config);

        if (response.data.email !== formData.email) {
          throw new Error('Email không khớp');
        }

        setSuccessMessage('Đăng nhập thành công!');
      }

      // Cập nhật trạng thái sau khi thành công
      setTimeout(() => {
        setUserData(formData);
        setIsLoggedIn(true);
        setIsFormVisible(false);
      }, 1500);
    } catch (err) {
      // Xử lý các lỗi từ phía server
      setErrorMessage(
        err.response?.status === 409
          ? 'Tài khoản đã tồn tại.'
          : 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Render spinner khi form ẩn
  if (!isFormVisible) {
    return (
      <div className="position-absolute top-50 start-50 translate-middle text-center">
        <div className="spinner-grow text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5 col-lg-4">
            <div className="bg-white rounded-4 p-4 shadow-sm">
              <div className="text-center mb-4">
                <h4 className="fw-bold mb-1 text-dark">
                  {isRegistering ? 'Tạo tài khoản' : 'Đăng nhập'}
                </h4>
                <p className="text-secondary small mb-0">
                  {isRegistering
                    ? 'Nhập thông tin để tạo tài khoản mới'
                    : 'Đăng nhập để tiếp tục'}
                </p>
              </div>

              <form>
                <div className="mb-3">
                  <input
                    id="referenceId-input"
                    type="text"
                    className="form-control form-control-lg bg-light border-0 rounded-3"
                    placeholder="Tên tài khoản"
                    name="referenceId"
                    value={formData.referenceId}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="mb-4">
                  <input
                    id="email-input"
                    type="email"
                    className="form-control form-control-lg bg-light border-0 rounded-3"
                    placeholder="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>

                {isRegistering && !isPhantomInstalled && (
                  <div className="alert alert-warning py-2 mt-3 mb-3 text-center small">
                    Vui lòng cài đặt Phantom Wallet để đăng ký
                  </div>
                )}

                <button
                  id="auth-button"
                  type="button"
                  className={`btn ${isRegistering ? 'btn-dark' : 'btn-primary'} w-100 py-3 rounded-3 position-relative overflow-hidden`}
                  onClick={() => handleAction(isRegistering)}
                  disabled={isLoading || (isRegistering && !isPhantomInstalled)}
                >
                  {isLoading ? (
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  ) : (
                    <span className="fw-semibold">
                      {isRegistering ? 'Đăng ký' : 'Đăng nhập'}
                    </span>
                  )}
                </button>
              </form>

              {errorMessage && (
                <div className="alert alert-danger py-2 mt-3 mb-0 text-center small">
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="alert alert-success py-2 mt-3 mb-0 text-center small">
                  {successMessage}
                </div>
              )}

              <div className="text-center mt-4">
                <button
                  type="button"
                  className="btn btn-link text-decoration-none p-0 text-secondary"
                  onClick={() => setIsRegistering(!isRegistering)}
                  disabled={isLoading}
                >
                  <small>
                    {isRegistering ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
                    <span className="text-primary fw-semibold">
                      {isRegistering ? 'Đăng nhập' : 'Đăng ký'}
                    </span>
                  </small>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;