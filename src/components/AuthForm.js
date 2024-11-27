import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiKey } from '../api';

const apiBaseUrl = "https://api.gameshift.dev/nx/users";

const AuthForm = ({ setIsLoggedIn, setUserData }) => {
  // Quản lý trạng thái dữ liệu biểu mẫu
  const [formData, setFormData] = useState({
    referenceId: '',
    email: '',
    externalWalletAddress: ''
  });

  // Trạng thái xem người dùng đang đăng ký hay đăng nhập
  const [isRegistering, setIsRegistering] = useState(false);

  // Quản lý trạng thái thông báo lỗi và thành công
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Quản lý trạng thái hiển thị biểu mẫu
  const [isFormVisible, setIsFormVisible] = useState(true);

  // Trạng thái tải trong quá trình gửi yêu cầu
  const [isLoading, setIsLoading] = useState(false);

  // Kiểm tra xem Phantom Wallet đã được cài đặt hay chưa
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);

  useEffect(() => {
    // Kiểm tra nếu Phantom Wallet có sẵn trong trình duyệt
    const checkPhantomWallet = () => {
      const { solana } = window;
      setIsPhantomInstalled(!!(solana && solana.isPhantom));
    };

    checkPhantomWallet(); // Gọi hàm kiểm tra khi component được mount
  }, []);

  // Kết nối với Phantom Wallet
  const connectPhantomWallet = async () => {
    if (!isPhantomInstalled) {
      setErrorMessage('Phantom Wallet chưa được cài đặt');
      return null;
    }

    try {
      // Thực hiện kết nối và trả về địa chỉ ví
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrorMessage(''); // Reset lỗi khi người dùng nhập lại
    setSuccessMessage(''); // Reset thông báo thành công
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

    setIsLoading(true); // Hiển thị trạng thái loading
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isRegister) {
        // Nếu đăng ký, kết nối Phantom Wallet trước
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
        // Xử lý đăng nhập
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

      // Cập nhật trạng thái và lưu thông tin người dùng sau khi thành công
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
      setIsLoading(false); // Tắt trạng thái loading
    }
  };

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
    // Phần giao diện hiển thị form
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
                    type="text"
                    className="form-control form-control-lg bg-light border-0 rounded-3"
                    placeholder="Reference ID"
                    name="referenceId"
                    value={formData.referenceId}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>

                <div className="mb-4">
                  <input
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