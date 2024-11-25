import React, { useState } from 'react';
import { apiKey } from '../api';

const CreateProduct = ({ referenceId, collectionId, onSuccess }) => {
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

  // Cloudinary configuration
  const CLOUDINARY_UPLOAD_PRESET = 'ARTSOLANA';
  const CLOUDINARY_CLOUD_NAME = 'dy3nmkszo';

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
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors(prev => ({
          ...prev,
          image: "Kích thước file không được vượt quá 5MB"
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
        console.error('Cloudinary error details:', errorData);
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('Cloudinary upload success:', data);
      return data.secure_url;
    } catch (err) {
      console.error('Error uploading to Cloudinary:', err);
      if (err.message.includes('upload_preset')) {
        throw new Error('Lỗi cấu hình upload preset. Vui lòng kiểm tra lại.');
      } else if (err.message.includes('api_key')) {
        throw new Error('Lỗi xác thực API key. Vui lòng kiểm tra lại.');
      }
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
      // Upload image to Cloudinary with progress tracking
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
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        image: null,
        attributeName: '',
        attributeValue: ''
      });
      setPreview(null);

      if (onSuccess) {
        onSuccess(data);
      }

    } catch (err) {
      console.error('Error creating product:', err);
      setError(err.message || "Không thể tạo sản phẩm. Vui lòng thử lại sau");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1000); // Reset progress after a delay
    }
  };

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow">
            <div className="card-header">
              <h5 className="card-title mb-0">Tạo Sản Phẩm Mới</h5>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                {/* Form fields remain the same */}
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
                        Hỗ trợ: JPG, PNG, GIF (Max: 5MB)
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
                    <div className="progress">
                      <div 
                        className="progress-bar" 
                        role="progressbar" 
                        style={{ width: `${uploadProgress}%` }}
                        aria-valuenow={uploadProgress} 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      >
                        {uploadProgress}%
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-end">
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
                      'Tạo sản phẩm'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProduct;