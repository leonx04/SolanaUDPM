import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { createRecord } from '../firebaseConfig';
import axios from 'axios';
import { apiKey } from '../api';
import { driver as Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import unidecode from 'unidecode';

const apiBaseUrl = "https://api.gameshift.dev/nx/users";
const PHANTOM_WALLET_DOWNLOAD_LINK = "https://phantom.app/download";

const AuthForm = ({ setIsLoggedIn, setUserData }) => {
  const { register, handleSubmit, formState: { errors }, setError, clearErrors } = useForm();
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPhantomInstalled, setIsPhantomInstalled] = useState(false);

  useEffect(() => {
    const checkPhantomWallet = () => {
      const { solana } = window;
      setIsPhantomInstalled(!!(solana && solana.isPhantom));
    };

    checkPhantomWallet();
    initializeDriverGuide();
  }, []);

  const initializeDriverGuide = () => {
    const driver = new Driver({
      animate: true,
      opacity: 0.75,
      nextBtnText: 'Tiếp theo',
      prevBtnText: 'Quay lại',
      doneBtnText: 'Hoàn tất',
      steps: [
        {
          element: '#referenceId',
          popover: {
            title: 'Tên đăng nhập',
            description: 'Nhập tên đăng nhập duy nhất. Đây là thông tin định danh đăng nhập của bạn trong hệ thống.',
            position: 'bottom'
          }
        },
        {
          element: '#email',
          popover: {
            title: 'Email',
            description: 'Điền địa chỉ email chính xác. Email này sẽ được sử dụng để xác thực và khôi phục đăng nhập.',
            position: 'bottom'
          }
        },
        {
          element: '#auth-button',
          popover: {
            title: 'Xác thực đăng nhập',
            description: 'Nhấn nút để hoàn tất quá trình đăng ký hoặc đăng nhập. Lưu ý đăng ký cần kết nối Phantom Wallet.',
            position: 'top'
          }
        }
      ]
    });

    driver.drive();
  };

  const connectPhantomWallet = async () => {
    if (!isPhantomInstalled) {
      setErrorMessage(
        <div>
          Phantom Wallet chưa được cài đặt.
          <a
            href={PHANTOM_WALLET_DOWNLOAD_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="alert-link ms-1"
          >
            Tải Phantom Wallet tại đây
          </a>
        </div>
      );
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

  const onSubmit = async (data) => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (isRegistering) {
        if (!isPhantomInstalled) {
          setErrorMessage(
            <div>
              Phantom Wallet chưa được cài đặt.
              <a
                href={PHANTOM_WALLET_DOWNLOAD_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="alert-link ms-1"
              >
                Tải Phantom Wallet tại đây
              </a>
            </div>
          );
          setIsLoading(false);
          return;
        }

        const walletAddress = await connectPhantomWallet();
        if (!walletAddress) {
          setIsLoading(false);
          return;
        }

        const config = {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': apiKey
          }
        };

        await axios.post(apiBaseUrl, {
          referenceId: data.referenceId,
          email: data.email,
          externalWalletAddress: walletAddress
        }, config);

        // Create a record in Firebase
        await createRecord(`/account/${data.referenceId}`, {
          referenceId: data.referenceId,
          email: data.email,
          imageUrl: null,
          socialLinks: null
        });

        setSuccessMessage('Đăng ký thành công!');
      } else {
        const config = {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey
          }
        };

        const response = await axios.get(`${apiBaseUrl}/${data.referenceId}`, config);

        if (response.data.email !== data.email) {
          throw new Error('Email không khớp');
        }

        setSuccessMessage('Đăng nhập thành công!');
      }

      setTimeout(() => {
        setUserData(data);
        setIsLoggedIn(true);
      }, 1500);
    } catch (err) {
      if (err.response?.status === 409) {
        setError('referenceId', { type: 'manual', message: 'đăng nhập đã tồn tại.' });
      } else if (err.message === 'Email không khớp') {
        setError('email', { type: 'manual', message: 'Email không khớp với đăng nhập.' });
      } else {
        setErrorMessage('Đã xảy ra lỗi. Vui lòng thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5 col-lg-4">
            <div className="bg-white rounded-4 p-4 shadow-sm">
              <div className="text-center mb-4">
                <h4 className="fw-bold mb-1 text-dark">
                  {isRegistering ? 'Tạo đăng nhập' : 'Đăng nhập'}
                </h4>
                <p className="text-secondary small mb-0">
                  {isRegistering
                    ? 'Nhập thông tin để tạo đăng nhập mới'
                    : 'Đăng nhập để tiếp tục'}
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-3">
                  <input
                    id="referenceId"
                    type="text"
                    className={`form-control form-control-lg bg-light border-0 rounded-3 ${errors.referenceId ? 'is-invalid' : ''}`}
                    placeholder="Tên đăng nhập"
                    {...register("referenceId", { 
                      required: "Vui lòng nhập tên đăng nhập",
                      validate: value => unidecode(value) === value || "Tên đăng nhập không được chứa dấu"
                    })}
                    disabled={isLoading}
                  />
                  {errors.referenceId && <div className="invalid-feedback">{errors.referenceId.message}</div>}
                </div>

                <div className="mb-4">
                  <input
                    id="email"
                    type="email"
                    className={`form-control form-control-lg bg-light border-0 rounded-3 ${errors.email ? 'is-invalid' : ''}`}
                    placeholder="Email"
                    {...register("email", { 
                      required: "Vui lòng nhập email",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Email không hợp lệ"
                      }
                    })}
                    disabled={isLoading}
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
                </div>

                {isRegistering && !isPhantomInstalled && (
                  <div className="alert alert-warning py-2 mt-3 mb-3 text-center small">
                    Vui lòng cài đặt Phantom Wallet để đăng ký
                    <a
                      href={PHANTOM_WALLET_DOWNLOAD_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="alert-link ms-1"
                    >
                      Tải tại đây
                    </a>
                  </div>
                )}

                <button
                  id="auth-button"
                  type="submit"
                  className={`btn ${isRegistering ? 'btn-dark' : 'btn-primary'} w-100 py-3 rounded-3 position-relative overflow-hidden`}
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
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    clearErrors();
                  }}
                  disabled={isLoading}
                >
                  <small>
                    {isRegistering ? 'Đã có đăng nhập? ' : 'Chưa có đăng nhập? '}
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

