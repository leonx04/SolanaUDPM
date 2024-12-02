import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Pagination, Row } from 'react-bootstrap';
import { apiKey } from '../api';

const ItemsGrid = ({ referenceId, isOwnProfile }) => {
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
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [marketFilter, setMarketFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const CLOUDINARY_UPLOAD_PRESET = 'ARTSOLANA';
    const CLOUDINARY_CLOUD_NAME = 'dy3nmkszo';

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

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let url = `https://api.gameshift.dev/nx/items`;
            const params = new URLSearchParams();

            if (referenceId) {
                params.append('ownerReferenceId', referenceId);
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

            params.append('limit', itemsPerPage.toString());

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
    }, [referenceId, marketFilter, itemsPerPage]);

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

    const openListingModal = (item) => {
        setSelectedItem(item);
        setListingPrice('');
        setListingError(null);
        setShowListingModal(true);
    };

    const openEditModal = (item) => {
        setEditItem(item);
        setEditImageUrl(item.imageUrl || '');
        setEditImageFile(null);
        setEditImagePreview(null);
        setEditAttributes(item.attributes || []);
        setEditError(null);
        setShowEditModal(true);
    };

    const addAttribute = () => {
        setEditAttributes([...editAttributes, { traitType: '', value: '' }]);
    };

    const removeAttribute = (indexToRemove) => {
        setEditAttributes(editAttributes.filter((_, index) => index !== indexToRemove));
    };

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

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    useEffect(() => {
        const pollInterval = setInterval(() => {
            fetchItems();
        }, 10000);

        return () => clearInterval(pollInterval);
    }, [fetchItems]);

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

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    return (
        <div className="items-grid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0">Vật phẩm</h5>
                <div className="d-flex gap-2">
                    <Form.Select
                        size="sm"
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    >
                        <option value={12}>12 vật phẩm</option>
                        <option value={24}>24 vật phẩm</option>
                        <option value={48}>48 vật phẩm</option>
                    </Form.Select>
                    <Form.Select
                        size="sm"
                        value={marketFilter}
                        onChange={(e) => setMarketFilter(e.target.value)}
                    >
                        <option value="all">Tất cả vật phẩm</option>
                        <option value="forSale">Đang bán</option>
                        <option value="notForSale">Không bán</option>
                    </Form.Select>
                    <Button size="sm" onClick={fetchItems}>
                        <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                </div>
            </div>

            <Form.Group className="mb-4">
                <Form.Control
                    type="text"
                    placeholder="Tìm kiếm vật phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </Form.Group>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                </div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-5 text-muted">Không tìm thấy vật phẩm nào</div>
            ) : (
                <>
                    <Row xs={1} sm={2} md={3} lg={4} className="g-4">
                        {currentItems.map((itemData, index) => {
                            const { type, item } = itemData;
                            if (type === 'Currency') return null;

                            return (
                                <Col key={index}>
                                    <Card>
                                        <Card.Img
                                            variant="top"
                                            src={item.imageUrl || 'https://via.placeholder.com/300'}
                                            alt={item.name}
                                            style={{ height: '200px', objectFit: 'cover' }}
                                        />
                                        <Card.Body>
                                            <Card.Title>{item.name || item.symbol || '-'}</Card.Title>
                                            <Card.Text>{item.description || '-'}</Card.Text>
                                            {(item.priceCents > 0 && item.status === 'Committed') ? (
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span className="text-success fw-bold">
                                                        {(item.priceCents / 100).toFixed(2)} USDC
                                                    </span>
                                                    {isOwnProfile && (
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleCancelSale(item.id)}
                                                            disabled={isProcessing}
                                                        >
                                                            {isProcessing ? 'Đang xử lý...' : 'Hủy bán'}
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                isOwnProfile && (
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            onClick={() => openEditModal(item)}
                                                        >
                                                            Chỉnh sửa
                                                        </Button>
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            onClick={() => openListingModal(item)}
                                                        >
                                                            Đăng bán
                                                        </Button>
                                                    </div>
                                                )
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>

                    <div className="d-flex justify-content-between align-items-center mt-4">
                        <div>
                            Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredItems.length)} trong số {filteredItems.length} vật phẩm
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

            <Modal show={showListingModal} onHide={() => setShowListingModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Đăng bán vật phẩm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {listingError && (
                        <Alert variant="danger">{listingError}</Alert>
                    )}
                    <Form>
                        <Form.Group>
                            <Form.Label>Tên vật phẩm</Form.Label>
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
                        {isProcessing ? 'Đang xử lý...' : 'Đăng bán'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Chỉnh sửa vật phẩm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editError && (
                        <Alert variant="danger">{editError}</Alert>
                    )}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Tên vật phẩm</Form.Label>
                            <Form.Control
                                type="text"
                                value={editItem?.name || ''}
                                readOnly
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Hình ảnh</Form.Label>
                            <div className="d-flex gap-3 align-items-start">
                                <div className="flex-grow-1">
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={handleEditImageChange}
                                        disabled={isEditing}
                                    />
                                    <Form.Text className="text-muted">
                                        JPG, PNG, GIF (Tối đa: 5MB)
                                    </Form.Text>
                                </div>
                                {(editImagePreview || editImageUrl) && (
                                    <div style={{ width: '100px', height: '100px' }}>
                                        <img
                                            src={editImagePreview || editImageUrl}
                                            alt="Xem trước"
                                            className="img-thumbnail"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Form.Group>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6>Thuộc tính</h6>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={addAttribute}
                            >
                                Thêm thuộc tính
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
                        {isEditing ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ItemsGrid;

