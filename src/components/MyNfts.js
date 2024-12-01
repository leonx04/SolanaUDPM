import React, { useState } from 'react';
import { Alert, Button, Modal, ProgressBar } from 'react-bootstrap';
import { apiKey } from '../api';
import ItemsTable from './ItemsTable';

const CreateProduct = ({ referenceId, collectionId, onSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null,
    attributeName: '',
    attributeValue: ''
  });

  const [preview, setPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const CLOUDINARY_UPLOAD_PRESET = 'ARTSOLANA';
  const CLOUDINARY_CLOUD_NAME = 'dy3nmkszo';

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image: null,
      attributeName: '',
      attributeValue: ''
    });
    setPreview(null);
    setFormErrors({});
    setError(null);
    setUploadProgress(0);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Tên sản phẩm là bắt buộc";
    } else if (formData.name.length > 32) {
      errors.name = "Tên không được vượt quá 32 ký tự";
    }

    if (!formData.description.trim()) {
      errors.description = "Mô tả là bắt buộc";
    } else if (formData.description.length > 64) {
      errors.description = "Mô tả không được vượt quá 64 ký tự";
    }

    if (!formData.image) {
      errors.image = "Hình ảnh là bắt buộc";
    }

    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setFormErrors(prev => ({
          ...prev,
          image: "Kích thước file không được vượt quá 50MB"
        }));
        return;
      }

      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({
          ...prev,
          image: "Vui lòng chọn file hình ảnh"
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      if (formErrors.image) {
        setFormErrors(prev => ({
          ...prev,
          image: null
        }));
      }
    }
  };

  const uploadImageToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('api_key', process.env.REACT_APP_CLOUDINARY_API_KEY);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (err) {
      console.error('Error uploading to Cloudinary:', err);
      throw new Error('Không thể tải lên hình ảnh. Vui lòng thử lại. Chi tiết: ' + err.message);
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
    setError(null);
    setUploadProgress(0);

    try {
      setUploadProgress(10);
      const imageUrl = await uploadImageToCloudinary(formData.image);
      setUploadProgress(50);

      if (!imageUrl) {
        throw new Error('Không nhận được URL hình ảnh từ Cloudinary');
      }

      const payload = {
        details: {
          collectionId: collectionId,
          name: formData.name,
          description: formData.description,
          imageUrl: imageUrl,
          attributes: []
        },
        destinationUserReferenceId: referenceId
      };

      if (formData.attributeName && formData.attributeValue) {
        payload.details.attributes.push({
          traitType: formData.attributeName,
          value: formData.attributeValue
        });
      }

      setUploadProgress(75);
      
      const response = await fetch('https://api.gameshift.dev/nx/unique-assets', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setUploadProgress(100);
      const data = await response.json();
      
      setIsSuccess(true);
      setResultMessage("Tạo sản phẩm thành công!");
      resetForm();
      setShowModal(false);

      if (onSuccess) {
        onSuccess(data);
      }

    } catch (err) {
      console.error('Error creating product:', err);
      setIsSuccess(false);
      setResultMessage(err.message || "Không thể tạo sản phẩm. Vui lòng thử lại sau");
    } finally {
      setIsSubmitting(false);
      setShowResultModal(true);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    resetForm();
  };

  return (
    <div>
      {/* Phần tạo sản phẩm */}
      <div className="mb-4">
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Tạo Sản Phẩm Mới
        </Button>
      </div>

      {/* Phần bảng hiển thị sản phẩm */}
      <div className="mt-4">
        <ItemsTable ownerReferenceId={referenceId} />
      </div>

      {/* Create Product Modal */}
      <Modal show={showModal} onHide={handleClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="theme-text">Tạo Sản Phẩm Mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Tên sản phẩm</label>
              <input 
                type="text" 
                className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nhập tên sản phẩm"
                disabled={isSubmitting}
                maxLength={32}
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
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Mô tả về sản phẩm"
                disabled={isSubmitting}
                maxLength={64}
              />
              {formErrors.description && (
                <div className="invalid-feedback">{formErrors.description}</div>
              )}
            </div>

            <div className="mb-3">
              <label className="form-label">Hình ảnh</label>
              <div className="d-flex gap-3 align-items-start">
                <div className="flex-grow-1">
                  <input 
                    type="file" 
                    className={`form-control ${formErrors.image ? 'is-invalid' : ''}`}
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                  />
                  {formErrors.image && (
                    <div className="invalid-feedback">{formErrors.image}</div>
                  )}
                  <small className="text-muted d-block mt-1">
                    Hỗ trợ: JPG, PNG, GIF (Max: 50MB)
                  </small>
                </div>
                {preview && (
                  <div style={{ width: '100px', height: '100px' }}>
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="img-thumbnail"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Tên thuộc tính (không bắt buộc)</label>
                <input 
                  type="text" 
                  className="form-control"
                  name="attributeName"
                  value={formData.attributeName}
                  onChange={handleInputChange}
                  placeholder="Tên thuộc tính"
                  disabled={isSubmitting}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Giá trị thuộc tính</label>
                <input 
                  type="text" 
                  className="form-control"
                  name="attributeValue"
                  value={formData.attributeValue}
                  onChange={handleInputChange}
                  placeholder="Giá trị thuộc tính"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {uploadProgress > 0 && (
              <div className="mb-3">
                <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} />
              </div>
            )}
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang tạo...
              </>
            ) : (
              'Tạo sản phẩm'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Result Modal */}
      <Modal show={showResultModal} onHide={() => setShowResultModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{isSuccess ? 'Thành công' : 'Lỗi'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant={isSuccess ? 'success' : 'danger'}>
            {resultMessage}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowResultModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CreateProduct;