import React, { useState, useEffect, useCallback } from 'react';
import { apiKey } from '../api';
import { Modal, Button, Form, Alert, Pagination } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';

const ItemsTable = ({ ownerReferenceId }) => {
    // State management
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [listingPrice, setListingPrice] = useState('');
    const [showListingModal, setShowListingModal] = useState(false);
    const [listingError, setListingError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [editImageUrl, setEditImageUrl] = useState('');
    const [editAttributes, setEditAttributes] = useState([]);
    const [editError, setEditError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editImageFile, setEditImageFile] = useState(null);
    const [editImagePreview, setEditImagePreview] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Update: Using itemsPerPage
    const [marketFilter, setMarketFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const CLOUDINARY_UPLOAD_PRESET = 'ARTSOLANA';
    const CLOUDINARY_CLOUD_NAME = 'dy3nmkszo';

    // Function to upload image to Cloudinary
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

    // Function to fetch items
    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let url = `https://api.gameshift.dev/nx/items`;
            const params = new URLSearchParams();

            if (ownerReferenceId) {
                params.append('ownerReferenceId', ownerReferenceId);
            }

            switch (marketFilter) {
                case 'forSale':
                    params.append('forSale', 'true');
                    break;
                case 'notForSale':
                    params.append('priceCents', 'null');
                    break;
                default:
                    break;
            }

            params.append('limit', itemsPerPage.toString()); // Update: Adding itemsPerPage to params

            url += `?${params.toString()}`;

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

            if (marketFilter === 'notForSale') {
                setItems(data.data.filter(item => item.item.priceCents === null));
            } else {
                setItems(data.data || []);
            }

        } catch (err) {
            setError('Lỗi khi tải items: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [ownerReferenceId, marketFilter, itemsPerPage]); // Update: Adding itemsPerPage to dependencies

    // Function to handle listing for sale
    const handleListForSale = async () => {
        if (!selectedItem || !listingPrice) {
            setListingError('Vui lòng nhập giá hợp lệ');
            return;
        }

        setIsProcessing(true);
        setListingError(null);

        try {
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

            if (data.consentUrl) {
                window.open(data.consentUrl, '_blank', 'noopener,noreferrer');
            }

            fetchItems();
        } catch (err) {
            setListingError(err.message);
        } finally {
            setIsProcessing(false);
            setShowListingModal(false);
        }
    };

    // Function to handle cancelling sale
    const handleCancelSale = async (itemId) => {
        setIsProcessing(true);
        setListingError(null);

        try {
            const response = await fetch(
                `https://api.gameshift.dev/nx/unique-assets/${itemId}/cancel-listing`,
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

            if (data.consentUrl) {
                window.open(data.consentUrl, '_blank', 'noopener,noreferrer');
            }

            fetchItems();
        } catch (err) {
            setListingError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Function to open listing modal
    const openListingModal = (item) => {
        setSelectedItem(item);
        setListingPrice('');
        setListingError(null);
        setShowListingModal(true);
    };

    // Function to truncate text
    const truncateText = (text, maxLength) => {
        if (!text) return '-';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // Function to open edit modal
    const openEditModal = (item) => {
        setEditItem(item);
        setEditImageUrl(item.imageUrl || '');
        setEditImageFile(null);
        setEditImagePreview(null);
        setEditAttributes(item.attributes || []);
        setEditError(null);
        setShowEditModal(true);
    };

    // Function to add attribute
    const addAttribute = () => {
        setEditAttributes([...editAttributes, { traitType: '', value: '' }]);
    };

    // Function to remove attribute
    const removeAttribute = (indexToRemove) => {
        setEditAttributes(editAttributes.filter((_, index) => index !== indexToRemove));
    };

    // Function to update attribute
    const updateAttribute = (index, field, value) => {
        const newAttributes = [...editAttributes];
        newAttributes[index][field] = value;
        setEditAttributes(newAttributes);
    };

    // Function to handle editing asset
    const handleEditAsset = async () => {
        if (!editItem) return;

        setIsEditing(true);
        setEditError(null);

        try {
            let newImageUrl = editImageUrl;

            if (editImageFile) {
                newImageUrl = await uploadImageToCloudinary(editImageFile);
            }

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

            await fetchItems();

            setShowEditModal(false);
            setEditImageFile(null);
            setEditImagePreview(null);
        } catch (err) {
            setEditError(err.message);
        } finally {
            setIsEditing(false);
        }
    };

    // Effect to fetch items
    useEffect(() => {
        fetchItems();
    }, [fetchItems, itemsPerPage]); // Update: Adding itemsPerPage to dependencies

    // Effect for polling
    useEffect(() => {
        const pollInterval = setInterval(() => {
            fetchItems();
        }, 10000);

        return () => clearInterval(pollInterval);
    }, [fetchItems, itemsPerPage]); // Update: Adding itemsPerPage to dependencies


    // Filtered and searched items
    const filteredItems = items.filter(itemData => {
        const { type, item } = itemData;

        if (type === 'Currency') return false;

        const matchesFilter = (marketFilter === 'forSale' && item.priceCents > 0 && item.status === 'Committed') ||
                              (marketFilter === 'notForSale' && (!item.priceCents || item.priceCents === 0)) ||
                              marketFilter === 'all';

        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              item.description.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    return (
        <div className="card w-100">
            <div className="card-header ">
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Danh Sách Items</h5>
                    <div className="d-flex align-items-center">
                        <select
                            className="form-select form-select-sm me-2"
                            style={{ width: 'auto' }}
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1); // Reset to first page when changing items per page
                            }}
                        >
                            <option value={5}>5 items</option>
                            <option value={10}>10 items</option>
                            <option value={20}>20 items</option>
                            <option value={50}>50 items</option>
                        </select>
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
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div className="card-body p-0">
                <div className="p-3">
                    <div className="input-group">
                        <span className="input-group-text">
                            <Search />
                        </span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Tìm kiếm theo tên hoặc mô tả..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="d-flex justify-content-center align-items-center p-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : error ? (
                    <div className="alert alert-danger m-3">{error}</div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-5 text-muted">Không tìm thấy items</div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead>
                                    <tr className="bg-light">
                                        <th style={{ width: '80px' }}>Ảnh</th>
                                        <th style={{ width: '180px' }}>Tên</th>
                                        <th style={{ width: '200px' }}>Mô tả</th>
                                        <th style={{ width: '120px' }}>Trạng Thái Bán</th>
                                        <th style={{ width: '150px' }}>Hành Động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((itemData, index) => {
                                        const { type, item } = itemData;
                                        if (type === 'Currency') return null;

                                        return (
                                            <tr key={index}>
                                                <td>
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            className="item-image"
                                                            title={item.name}
                                                            style={{
                                                                width: "40px",
                                                                height: "40px",
                                                                objectFit: "cover",
                                                                borderRadius: "4px"
                                                            }}
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
                                                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={item.description}>
                                                        {item.description || '-'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {(item.priceCents > 0 && item.status === 'Committed') ? (
                                                        <span className="badge badge-success">
                                                            Đang Bán
                                                            <br />
                                                            <small>{(item.priceCents / 100).toFixed(2)} USDC</small>
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-secondary">Chưa Bán</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {type === 'UniqueAsset' && (
                                                        <div className="d-flex gap-2">
                                                            {!(item.priceCents > 0 && item.status === 'Committed') && (
                                                                <Button
                                                                    variant="outline-secondary"
                                                                    size="sm"
                                                                    onClick={() => openEditModal(item)}
                                                                >
                                                                    Sửa
                                                                </Button>
                                                            )}
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
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex justify-content-between align-items-center p-3">
                            <div>
                                Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredItems.length)} trong số {filteredItems.length} items
                            </div>
                            <Pagination>
                                <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                                <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
                                {[...Array(totalPages)].map((_, index) => (
                                    <Pagination.Item
                                        key={index + 1}
                                        active={currentPage === index + 1}
                                        onClick={() => setCurrentPage(index + 1)}
                                    >
                                        {index + 1}
                                    </Pagination.Item>
                                ))}
                                <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
                                <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                            </Pagination>
                        </div>
                    </>
                )}
            </div>

            <Modal show={showListingModal} onHide={() => setShowListingModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Liệt Kê Tài Sản Bán</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {listingError && (
                        <Alert variant="danger">{listingError}</Alert>
                    )}
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
                                placeholder="Nhập giá (USDC)"
                                value={listingPrice}
                                onChange={(e) => setListingPrice(e.target.value)}
                                min="0.01"
                                step="0.01"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setShowListingModal(false)}
                        disabled={isProcessing}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleListForSale}
                        disabled={isProcessing || !listingPrice}
                    >
                        {isProcessing ? 'Đang Xử Lý...' : 'Liệt Kê Bán'}
                    </Button>
                </Modal.Footer>
            </Modal>

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

