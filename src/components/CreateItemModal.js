import React, { useState } from 'react';
import { Alert, Button, Form, Modal, ProgressBar } from 'react-bootstrap';
import { apiKey } from '../api';

const CLOUDINARY_UPLOAD_PRESET = 'ARTSOLANA';
const CLOUDINARY_CLOUD_NAME = 'dy3nmkszo';

const COLLECTION_IDS = {
  art: '7709064c-7f03-4891-801f-a2de787a688f',
  images: 'fdd7a4c0-2312-45db-bcc2-ccdea75cc20a',
};

const CreateItemModal = ({ show, onHide, referenceId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: null,
    attributeName: '',
    attributeValue: ''
  });
  const [selectedCollection, setSelectedCollection] = useState(COLLECTION_IDS.art);
  const [preview, setPreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setFormErrors(prev => ({ ...prev, image: "Kích thước file không được vượt quá 50MB" }));
        return;
      }

      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({ ...prev, image: "Vui lòng chọn file hình ảnh" }));
        return;
      }

      setFormData(prev => ({ ...prev, image: file }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      if (formErrors.image) {
        setFormErrors(prev => ({ ...prev, image: null }));
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
          collectionId: selectedCollection,
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
      
      onSuccess(data);
    } catch (err) {
      console.error('Error creating item:', err);
      setError(err.message || "Không thể tạo vật phẩm. Vui lòng thử lại sau");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "Tên vật phẩm là bắt buộc";
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

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Tạo Vật Phẩm Mới</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Tên vật phẩm</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              isInvalid={!!formErrors.name}
              disabled={isSubmitting}
              maxLength={32}
            />
            <Form.Control.Feedback type="invalid">
              {formErrors.name}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Bộ sưu tập</Form.Label>
            <Form.Select
              name="collection"
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              disabled={isSubmitting}
            >
              <option value={COLLECTION_IDS.art}>Bộ sưu tập tranh</option>
              <option value={COLLECTION_IDS.images}>Bộ sưu tập hình ảnh</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Mô tả</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              isInvalid={!!formErrors.description}
              disabled={isSubmitting}
              maxLength={64}
            />
            <Form.Control.Feedback type="invalid">
              {formErrors.description}
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Hình ảnh</Form.Label>
            <div className="d-flex gap-3 align-items-start">
              <div className="flex-grow-1">
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  isInvalid={!!formErrors.image}
                  disabled={isSubmitting}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.image}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  Hỗ trợ: JPG, PNG, GIF (Max: 50MB)
                </Form.Text>
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
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Tên thuộc tính (không bắt buộc)</Form.Label>
            <Form.Control
              type="text"
              name="attributeName"
              value={formData.attributeName}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Giá trị thuộc tính</Form.Label>
            <Form.Control
              type="text"
              name="attributeValue"
              value={formData.attributeValue}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </Form.Group>

          {uploadProgress > 0 && (
            <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} className="mb-3" />
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo...' : 'Tạo vật phẩm'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateItemModal;

