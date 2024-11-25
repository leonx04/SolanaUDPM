import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiKey } from '../api';

const MyNfts = ({ referenceId }) => {
  const [myNfts, setMyNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Form state for new NFT
  const [newNft, setNewNft] = useState({
    name: '',
    description: '',
    price: '',
    image: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const validateReferenceId = (id) => {
    return typeof id === 'string' && id.length > 0;
  };

  const fetchMyNfts = async () => {
    if (!validateReferenceId(referenceId)) {
      setError("ID tham chiếu không hợp lệ");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`https://api.gameshift.dev/nx/nfts/${referenceId}`, {
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "x-api-key": apiKey,
        },
        timeout: 5000, // 5 second timeout
      });

      if (response.status === 200 && Array.isArray(response.data)) {
        setMyNfts(response.data);
      } else {
        throw new Error("Dữ liệu không đúng định dạng");
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // Implement retry logic
      if (retryCount < maxRetries && shouldRetry(err)) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchMyNfts, 1000 * (retryCount + 1)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          return "Không tìm thấy dữ liệu NFT cho tài khoản này";
        case 401:
          return "Không có quyền truy cập. Vui lòng đăng nhập lại";
        case 403:
          return "Không có quyền xem NFT này";
        default:
          return "Có lỗi xảy ra khi tải dữ liệu NFT";
      }
    }
    if (error.code === 'ECONNABORTED') {
      return "Kết nối đến máy chủ quá chậm. Vui lòng thử lại";
    }
    return "Không thể tải dữ liệu NFT. Vui lòng thử lại sau";
  };

  const shouldRetry = (error) => {
    return error.response?.status === 404 || 
           error.code === 'ECONNABORTED' ||
           !error.response;
  };

  const validateForm = () => {
    const errors = {};
    if (!newNft.name.trim()) errors.name = "Tên NFT là bắt buộc";
    if (!newNft.description.trim()) errors.description = "Mô tả là bắt buộc";
    if (!newNft.price || newNft.price <= 0) errors.price = "Giá phải lớn hơn 0";
    if (!newNft.image) errors.image = "Hình ảnh là bắt buộc";
    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    setNewNft(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }));
    // Clear error when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Implement NFT creation logic here
      // Reset form after successful submission
      setNewNft({
        name: '',
        description: '',
        price: '',
        image: null
      });
      document.getElementById('createNftModal').classList.remove('show');
      document.body.classList.remove('modal-open');
      document.querySelector('.modal-backdrop')?.remove();
    } catch (err) {
      setError("Không thể tạo NFT. Vui lòng thử lại sau");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchMyNfts();
  };

  useEffect(() => {
    if (referenceId) {
      fetchMyNfts();
    }
  }, [referenceId]);

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-12 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
            <p className="mt-3 text-muted">
              Đang tải NFT của bạn{retryCount > 0 ? ` (Lần thử ${retryCount}/${maxRetries})` : ''}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
                {retryCount < maxRetries && (
                  <button 
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleRetry}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Thử lại
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0">Bộ sưu tập NFT của tôi</h2>
            <button 
              className="btn btn-primary" 
              data-bs-toggle="modal" 
              data-bs-target="#createNftModal"
              disabled={isSubmitting}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Đăng bán NFT mới
            </button>
          </div>
        </div>
      </div>

      {myNfts && myNfts.length > 0 ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
          {myNfts.map((nft) => (
            <div key={nft.id} className="col">
              <div className="card h-100 shadow-sm hover-shadow">
                <div className="position-relative">
                  <img 
                    src={nft.image || "/api/placeholder/400/400"} 
                    className="card-img-top" 
                    alt={nft.name}
                    style={{ height: '200px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.src = "/api/placeholder/400/400";
                    }}
                  />
                  <div className="position-absolute top-0 end-0 m-2">
                    <span className="badge bg-primary">
                      {nft.price} SOL
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <h5 className="card-title text-truncate">{nft.name}</h5>
                  <p className="card-text small text-muted">
                    {nft.description || 'Không có mô tả'}
                  </p>
                </div>
                <div className="card-footer bg-transparent border-top-0">
                  <div className="d-grid gap-2">
                    <button className="btn btn-outline-primary btn-sm">
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <div className="card shadow-sm border-0 p-4">
              <div className="card-body">
                <i className="bi bi-collection display-1 text-muted mb-3"></i>
                <h4>Chưa có NFT nào</h4>
                <p className="text-muted">
                  Bạn chưa sở hữu NFT nào. Hãy bắt đầu bằng cách tạo hoặc mua NFT đầu tiên của bạn.
                </p>
                <button className="btn btn-primary">
                  Khám phá NFT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo NFT mới */}
      <div className="modal fade" id="createNftModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Đăng bán NFT mới</h5>
              <button 
                type="button" 
                className="btn-close" 
                data-bs-dismiss="modal" 
                aria-label="Close"
                disabled={isSubmitting}
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Tên NFT</label>
                  <input 
                    type="text" 
                    className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                    name="name"
                    value={newNft.name}
                    onChange={handleInputChange}
                    placeholder="Nhập tên NFT"
                    disabled={isSubmitting}
                  />
                  {formErrors.name && (
                    <div className="invalid-feedback">{formErrors.name}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Mô tả</label>
                  <textarea 
                    className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                    name="description"
                    value={newNft.description}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Mô tả về NFT của bạn"
                    disabled={isSubmitting}
                  ></textarea>
                  {formErrors.description && (
                    <div className="invalid-feedback">{formErrors.description}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Giá (SOL)</label>
                  <input 
                    type="number" 
                    className={`form-control ${formErrors.price ? 'is-invalid' : ''}`}
                    name="price"
                    value={newNft.price}
                    onChange={handleInputChange}
                    placeholder="Nhập giá"
                    step="0.01"
                    min="0"
                    disabled={isSubmitting}
                  />
                  {formErrors.price && (
                    <div className="invalid-feedback">{formErrors.price}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Hình ảnh</label>
                  <input 
                    type="file" 
                    className={`form-control ${formErrors.image ? 'is-invalid' : ''}`}
                    name="image"
                    onChange={handleInputChange}
                    accept="image/*"
                    disabled={isSubmitting}
                  />
                  {formErrors.image && (
                    <div className="invalid-feedback">{formErrors.image}</div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  data-bs-dismiss="modal"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Đang tạo...
                    </>
                  ) : (
                    'Tạo NFT'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyNfts;