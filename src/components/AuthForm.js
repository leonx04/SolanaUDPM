import React, { useState } from 'react';
import axios from 'axios';
import { apiKey } from '../api';

const apiBaseUrl = "https://api.gameshift.dev/nx/users";

const AuthForm = ({ setIsLoggedIn, setUserData }) => {
  const [formData, setFormData] = useState({
    referenceId: '',
    email: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFormVisible, setIsFormVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrorMessage('');
    setSuccessMessage('');
  };

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

  const handleAction = async (isRegister) => {
    if (!validateForm()) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const config = {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': apiKey
        }
      };

      if (isRegister) {
        // Đăng ký người dùng (POST request)
        await axios.post(apiBaseUrl, {
          referenceId: formData.referenceId,
          email: formData.email
        }, config);

        setSuccessMessage('Đăng ký thành công!');
      } else {
        // Đăng nhập người dùng (kiểm tra tài khoản)
        try {
          // Thử lấy thông tin người dùng bằng referenceId
          const response = await axios.get(`${apiBaseUrl}/${formData.referenceId}`, config);
          
          // Kiểm tra email có khớp với tài khoản không
          if (response.data.email !== formData.email) {
            throw new Error('Email không khớp');
          }

          setSuccessMessage('Đăng nhập thành công!');
        } catch (err) {
          // Xử lý lỗi chi tiết hơn
          if (err.response && err.response.status === 404) {
            setErrorMessage('Tài khoản không tồn tại.');
          } else if (err.message === 'Email không khớp') {
            setErrorMessage('Email không khớp với tài khoản.');
          } else {
            setErrorMessage('Đăng nhập thất bại. Vui lòng thử lại.');
          }
          return;
        }
      }

      // Cập nhật trạng thái đăng nhập
      setTimeout(() => {
        setUserData(formData);
        setIsLoggedIn(true);
        setIsFormVisible(false);
      }, 1500);

    } catch (err) {
      // Xử lý lỗi đăng ký
      setErrorMessage(
        err.response?.status === 409
          ? 'Tài khoản đã tồn tại.'
          : 'Đã xảy ra lỗi. Vui lòng thử lại sau.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Phần render giữ nguyên như trước
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

                <button
                  type="button"
                  className={`btn ${isRegistering ? 'btn-dark' : 'btn-primary'} w-100 py-3 rounded-3 position-relative overflow-hidden`}
                  onClick={() => handleAction(isRegistering)}
                  disabled={isLoading}
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