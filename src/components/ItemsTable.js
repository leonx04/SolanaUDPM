import React, { useState, useEffect } from 'react';
import { apiKey } from '../api';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

const ItemsTable = ({ ownerReferenceId }) => {
    // State quản lý danh sách items
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State quản lý việc liệt kê và hủy bán
    const [selectedItem, setSelectedItem] = useState(null);
    const [listingPrice, setListingPrice] = useState('');
    const [showListingModal, setShowListingModal] = useState(false);
    const [listingError, setListingError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // State mới cho chức năng chỉnh sửa
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editAttributes, setEditAttributes] = useState([]);
    const [editError, setEditError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    // Thêm vào các state khác của component
    const [editImageFile, setEditImageFile] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);

    // Thêm ở đầu file, ngay sau các import
    const CLOUDINARY_UPLOAD_PRESET = 'ARTSOLANA';
    const CLOUDINARY_CLOUD_NAME = 'dy3nmkszo';

    // Hàm upload ảnh lên Cloudinary
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

    const handleEditImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setEditError("Kích thước file không được vượt quá 5MB");
                return;
            }

            if (!file.type.startsWith('image/')) {
                setEditError("Vui lòng chọn file hình ảnh");
                return;
            }

            setEditImageFile(file);

            const reader = new FileReader();
            reader.onloadend = () => {
                setEditImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // State quản lý bộ lọc thị trường
    const [marketFilter, setMarketFilter] = useState('all');

    // Hàm tìm nạp danh sách items
    const fetchItems = async () => {
        setLoading(true);
        setError(null);

        try {
            // Xây dựng URL với các tham số lọc
            let url = `https://api.gameshift.dev/nx/items`;
            const params = new URLSearchParams();

            // Thêm tham số chủ sở hữu nếu có
            if (ownerReferenceId) {
                params.append('ownerReferenceId', ownerReferenceId);
            }

            // Áp dụng bộ lọc trạng thái bán
            switch (marketFilter) {
                case 'forSale':
                    params.append('forSale', 'true');
                    break;
                case 'notForSale':
                    params.append('forSale', 'false');
                    break;
            }

            url += `?${params.toString()}`;

            // Gọi API để lấy danh sách items
            const response = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'x-api-key': apiKey
                }
            });

            if (!response.ok) {
                throw new Error('Không thể tải danh sách items');
            }

            const data = await response.json();
            setItems(data.data || []);
        } catch (err) {
            setError('Lỗi khi tải items: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Tự động tải items khi component mount hoặc các dependency thay đổi
    useEffect(() => {
        fetchItems();
    }, [ownerReferenceId, marketFilter]);

    // Hàm xử lý liệt kê tài sản bán
    const handleListForSale = async () => {
        // Kiểm tra tính hợp lệ của giá
        if (!selectedItem || !listingPrice) {
            setListingError('Vui lòng nhập giá hợp lệ');
            return;
        }

        setIsProcessing(true);
        setListingError(null);

        try {
            // Gọi API để liệt kê tài sản
            const response = await fetch(
                `https://api.gameshift.dev/nx/unique-assets/${selectedItem.id}/list-for-sale`,
                {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify({
                        price: {
                            currencyId: 'USDC',
                            naturalAmount: listingPrice
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể liệt kê tài sản');
            }

            const data = await response.json();

            // Chuyển hướng người dùng đến URL đồng ý
            if (data.consentUrl) {
                window.location.href = data.consentUrl;
            }

            // Làm mới danh sách sau khi liệt kê
            fetchItems();
        } catch (err) {
            setListingError(err.message);
        } finally {
            setIsProcessing(false);
            setShowListingModal(false);
        }
    };

    // Hàm xử lý hủy bán tài sản
    const handleCancelSale = async (itemId) => {
        setIsProcessing(true);
        setListingError(null);

        try {
            // Gọi API để hủy bán tài sản với URL mới
            const response = await fetch(
                `https://api.gameshift.dev/assets/${itemId}/cancel-listing`, // Thay đổi URL endpoint
                {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'x-api-key': apiKey
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể hủy bán tài sản');
            }

            const data = await response.json();

            // Chuyển hướng người dùng đến URL đồng ý
            if (data.consentUrl) {
                window.location.href = data.consentUrl;
            }

            // Làm mới danh sách sau khi hủy bán
            fetchItems();
        } catch (err) {
            setListingError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Mở modal để liệt kê tài sản
    const openListingModal = (item) => {
        setSelectedItem(item);
        setListingPrice('');
        setListingError(null);
        setShowListingModal(true);
    };

    // Hàm rút gọn văn bản
    const truncateText = (text, maxLength) => {
        if (!text) return '-';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Hàm mở modal chỉnh sửa
    const openEditModal = (item) => {
        setEditItem(item);
        setEditImageUrl(item.imageUrl || '');
        setEditImageFile(null);
        setEditImagePreview(null);

        // Khởi tạo attributes từ item hiện tại
        setEditAttributes(item.attributes || []);

        setEditError(null);
        setShowEditModal(true);
    };

    // Hàm thêm thuộc tính mới
    const addAttribute = () => {
        setEditAttributes([...editAttributes, { traitType: '', value: '' }]);
    };

    // Hàm xóa thuộc tính
    const removeAttribute = (indexToRemove) => {
        setEditAttributes(editAttributes.filter((_, index) => index !== indexToRemove));
    };

    // Hàm cập nhật thuộc tính
    const updateAttribute = (index, field, value) => {
        const newAttributes = [...editAttributes];
        newAttributes[index][field] = value;
        setEditAttributes(newAttributes);
    };

    const handleEditAsset = async () => {
        if (!editItem) return;

        setIsEditing(true);
        setEditError(null);

        try {
            let newImageUrl = editImageUrl;

            // Nếu có file ảnh mới, tiến hành upload
            if (editImageFile) {
                newImageUrl = await uploadImageToCloudinary(editImageFile);
            }

            // Chuẩn bị payload cho API
            const payload = {
                imageUrl: newImageUrl,
                attributes: editAttributes
            };

            const response = await fetch(
                `https://api.gameshift.dev/nx/unique-assets/${editItem.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify(payload)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể chỉnh sửa tài sản');
            }

            // Làm mới danh sách sau khi chỉnh sửa
            await fetchItems();

            // Đóng modal và reset state
            setShowEditModal(false);
            setEditImageFile(null);
            setEditImagePreview(null);
        } catch (err) {
            setEditError(err.message);
        } finally {
            setIsEditing(false);
        }
    };

    // Reset state khi mở modal chỉnh sửa



    return (
        <div className="card w-100">
            {/* Tiêu đề và các nút điều khiển */}
            <div className="card-header bg-white">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Danh Sách Items</h5>
                    <div className="d-flex align-items-center">
                        {/* Dropdown lọc thị trường */}
                        <select
                            className="form-select form-select-sm me-2"
                            style={{ width: 'auto' }}
                            value={marketFilter}
                            onChange={(e) => setMarketFilter(e.target.value)}
                        >
                            <option value="all">Tất Cả Mặt Hàng</option>
                            <option value="forSale">Đang Được Bán</option>
                            <option value="notForSale">Chưa Được Bán</option>
                        </select>
                        <button
                            onClick={fetchItems}
                            className="btn btn-primary btn-sm"
                        >
                            <i className="fas fa-sync-alt me-1"></i> Làm mới
                        </button>
                    </div>
                </div>
            </div>

            {/* Nội dung danh sách items */}
            <div className="card-body p-0">
                {/* Trạng thái tải và lỗi */}
                {loading ? (
                    <div className="d-flex justify-content-center align-items-center p-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="alert alert-danger m-3">{error}</div>
                ) : items.length === 0 ? (
                    <div className="text-center py-5 text-muted">Không tìm thấy items</div>
                ) : (
                    <div className="table-responsive">
                        <style>
                            {`
                @media (max-width: 768px) {
                  .table-responsive {
                    display: block;
                    width: 100%;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                  }
                  
                  .mobile-table-wrapper {
                    min-width: 800px;
                  }
                }

                .item-image {
                  width: 40px;
                  height: 40px;
                  object-fit: cover;
                  border-radius: 4px;
                  transition: transform 0.2s;
                }

                .item-image:hover {
                  transform: scale(3);
                  z-index: 1000;
                }

                .table > :not(caption) > * > * {
                  padding: 0.75rem;
                  vertical-align: middle;
                }

                .badge-currency {
                  background-color: #e3f2fd;
                  color: #1976d2;
                }

                .badge-asset {
                  background-color: #f3e5f5;
                  color: #7b1fa2;
                }

                .badge-for-sale {
                  background-color: #e8f5e9;
                  color: #2e7d32;
                }

                .table-hover tbody tr:hover {
                  background-color: rgba(0, 0, 0, 0.02);
                }

                .mint-address {
                  font-family: monospace;
                  font-size: 0.875em;
                  background-color: #f8f9fa;
                  padding: 0.2em 0.4em;
                  border-radius: 3px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 150px;
                  display: inline-block;
                }
              `}
                        </style>
                        <div className="mobile-table-wrapper">
                            <table className="table table-hover mb-0">
                                {/* Tiêu đề bảng */}
                                <thead>
                                    <tr className="bg-light">
                                        <th style={{ width: '90px' }}>Loại</th>
                                        <th style={{ width: '80px' }}>Ảnh</th>
                                        <th style={{ width: '180px' }}>Tên</th>
                                        <th style={{ width: '200px' }}>Mô tả</th>
                                        <th style={{ width: '120px' }}>Trạng Thái Bán</th>
                                        <th style={{ width: '200px' }}>Địa chỉ ví</th>
                                        <th style={{ width: '150px' }}>Hành Động</th>
                                    </tr>
                                </thead>
                                {/* Nội dung bảng */}
                                <tbody>
                                    {items.map((itemData, index) => {
                                        const { type, item } = itemData;
                                        return (
                                            <tr key={index}>
                                                {/* Các cột thông tin */}
                                                <td>
                                                    <span className={`badge ${type === 'Currency' ? 'badge-currency' : 'badge-asset'}`}>
                                                        {type}
                                                    </span>
                                                </td>
                                                <td>
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="item-image"
                                                            title={item.name}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="bg-light d-flex align-items-center justify-content-center"
                                                            style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                                                        >
                                                            <i className="fas fa-image text-muted"></i>
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="fw-medium">{item.name || item.symbol || '-'}</div>
                                                    <small className="text-muted">ID: {truncateText(item.id, 15)}</small>
                                                </td>
                                                <td>
                                                    {type === 'Currency' ? (
                                                        <div>
                                                            <span className="badge bg-light text-dark">
                                                                Decimals: {item.decimals}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={item.description}>
                                                            {item.description || '-'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {(item.priceCents > 0 && item.status === 'Committed') ? (
                                                        <span className="badge badge-for-sale">
                                                            Đang Bán
                                                            <br />
                                                            <small>{(item.priceCents / 100).toFixed(2)} USDC</small>
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-secondary">Chưa Bán</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="mint-address" title={item.mintAddress}>
                                                        {item.mintAddress}
                                                    </span>
                                                </td>
                                                {/* Nút hành động */}
                                                <td>
                                                    {type === 'UniqueAsset' && (
                                                        <div className="d-flex gap-2">
                                                            {/* Nút chỉnh sửa */}
                                                            <Button
                                                                variant="outline-secondary"
                                                                size="sm"
                                                                onClick={() => openEditModal(item)}
                                                            >
                                                                Sửa
                                                            </Button>
                                                            {/* Giữ nguyên các nút hành động khác */}
                                                        </div>
                                                    )}
                                                    {type === 'UniqueAsset' && (
                                                        <>
                                                            {item.priceCents > 0 && item.status === 'Committed' ? (
                                                                <Button
                                                                    variant="outline-danger"
                                                                    size="sm"
                                                                    onClick={() => handleCancelSale(item.id)}
                                                                    disabled={isProcessing}
                                                                >
                                                                    {isProcessing ? 'Đang Xử Lý...' : 'Hủy Bán'}
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline-primary"
                                                                    size="sm"
                                                                    onClick={() => openListingModal(item)}
                                                                >
                                                                    Liệt Kê Bán
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal liệt kê bán */}
            <Modal show={showListingModal} onHide={() => setShowListingModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Liệt Kê Tài Sản Bán</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Hiển thị lỗi nếu có */}
                    {listingError && (
                        <Alert variant="danger">{listingError}</Alert>
                    )}

                    {/* Form nhập thông tin bán */}
                    <Form>
                        <Form.Group>
                            <Form.Label>Tên Tài Sản</Form.Label>
                            <Form.Control
                                type="text"
                                value={selectedItem?.name || ''}
                                readOnly
                            />
                        </Form.Group>

                        <Form.Group className="mt-3">
                            <Form.Label>Giá (USDC)</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="Nhập giá"
                                value={listingPrice}
                                onChange={(e) => setListingPrice(e.target.value)}
                                min="0.01"
                                step="0.01"
                            />
                            <Form.Text className="text-muted">
                                Nhập giá bán tài sản bằng USDC
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {/* Nút hủy và xác nhận */}
                    <Button
                        variant="secondary"
                        onClick={() => setShowListingModal(false)}
                        disabled={isProcessing}
                    >
                        Hủy</Button>
                    <Button
                        variant="primary"
                        onClick={handleListForSale}
                        disabled={isProcessing || !listingPrice}
                    >
                        {isProcessing ? 'Đang Xử Lý...' : 'Liệt Kê Bán'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal chỉnh sửa tài sản */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Chỉnh Sửa Tài Sản</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editError && (
                        <Alert variant="danger">{editError}</Alert>
                    )}

                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Tên Tài Sản</Form.Label>
                            <Form.Control
                                type="text"
                                value={editItem?.name || ''}
                                readOnly
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Hình Ảnh</Form.Label>
                            <div className="d-flex gap-3 align-items-start">
                                <div className="flex-grow-1">
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={handleEditImageChange}
                                        disabled={isEditing}
                                    />
                                    <Form.Text className="text-muted">
                                        JPG, PNG, GIF (Max: 5MB)
                                    </Form.Text>
                                </div>
                                {(editImagePreview || editImageUrl) && (
                                    <div style={{ width: '100px', height: '100px' }}>
                                        <img
                                            src={editImagePreview || editImageUrl}
                                            alt="Preview"
                                            className="img-thumbnail"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Form.Group>

                        {/* Loại bỏ trường URL hình ảnh cũ */}

                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6>Thuộc Tính</h6>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={addAttribute}
                            >
                                Thêm Thuộc Tính
                            </Button>
                        </div>

                        {editAttributes.map((attr, index) => (
                            <div key={index} className="d-flex mb-2 gap-2">
                                <Form.Control
                                    type="text"
                                    placeholder="Tên thuộc tính"
                                    value={attr.traitType}
                                    onChange={(e) => updateAttribute(index, 'traitType', e.target.value)}
                                />
                                <Form.Control
                                    type="text"
                                    placeholder="Giá trị thuộc tính"
                                    value={attr.value}
                                    onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                                />
                                <Button
                                    variant="outline-danger"
                                    onClick={() => removeAttribute(index)}
                                >
                                    Xóa
                                </Button>
                            </div>
                        ))}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowEditModal(false)}
                        disabled={isEditing}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleEditAsset}
                        disabled={isEditing}
                    >
                        {isEditing ? 'Đang Lưu...' : 'Lưu Thay Đổi'}
                    </Button>
                </Modal.Footer>
            </Modal>

        </div>
    );
};

export default ItemsTable;