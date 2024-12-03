import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { apiKey } from '../api';
import { UserContext } from '../contexts/UserContext';

const ItemsForSale = ({ referenceId, isOwnProfile, loggedInUserId }) => {
    const [userData] = useContext(UserContext);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
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
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [marketFilter, setMarketFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [buyError, setBuyError] = useState(null);
    const [buyLoading, setBuyLoading] = useState(false);

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

        try {
            let url = `https://api.gameshift.dev/nx/items`;
            const params = new URLSearchParams();

            if (referenceId) {
                params.append('ownerReferenceId', referenceId);
            }

            if (!isOwnProfile) {
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
            setItems(data.data || []);

        } catch (err) {
            console.error('Lỗi khi tải items:', err.message);
        } finally {
            setLoading(false);
        }
    }, [referenceId, marketFilter, itemsPerPage, isOwnProfile]);

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
        setListingPrice(item.price?.naturalAmount || '');
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

    const filteredItems = useMemo(() => {
        return items.filter(itemData => {
            const item = itemData.item;
            return itemData.type === 'UniqueAsset' &&
                   (isOwnProfile || (item.price && parseFloat(item.price.naturalAmount) > 0)) &&
                   (marketFilter === 'all' ||
                    (marketFilter === 'forSale' && item.status === 'Committed') ||
                    (marketFilter === 'notForSale' && item.status !== 'Committed'));
        });
    }, [items, marketFilter, isOwnProfile]);

    const handleBuyItem = (item) => {
        setSelectedItem(item);
        setShowBuyModal(true);
        setBuyError(null);
    };

    const buyItemWithPhantomWallet = async () => {
        setBuyLoading(true);
        setBuyError(null);

        try {
            const provider = window.phantom?.solana;
            if (!provider || !provider.isConnected) {
                throw new Error("Vui lòng kết nối ví Phantom trước khi mua");
            }

            // Ensure the buyer is using their own account
            const buyerId = userData.referenceId;

            if (buyerId === selectedItem.owner.referenceId) {
                throw new Error("Bạn không thể mua sản phẩm của chính mình");
            }

            const response = await fetch(
                `https://api.gameshift.dev/nx/unique-assets/${selectedItem.id}/buy`,
                {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': apiKey
                    },
                    body: JSON.stringify({
                        buyerId: buyerId
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể thực hiện giao dịch');
            }

            const data = await response.json();
            const { consentUrl } = data;
            window.open(consentUrl, '_blank');
            fetchItems();
            setShowBuyModal(false);
        } catch (err) {
            console.error('Lỗi mua sản phẩm:', err);
            setBuyError(err.message || 'Không thể thực hiện giao dịch. Vui lòng thử lại.');
        } finally {
            setBuyLoading(false);
        }
    };

    const renderProductGrid = () => {
        if (loading) {
            return (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Đang tải dữ liệu...</p>
                </div>
            );
        }

        if (filteredItems.length === 0) {
            return (
                <div className="text-center py-5">
                    <i className="bi bi-inbox-fill text-muted" style={{ fontSize: '4rem' }}></i>
                    <h2 className="text-muted mt-3">Không có sản phẩm nào</h2>
                    <p className="text-muted">Hiện tại chưa có sản phẩm nào để hiển thị.</p>
                    <Button
                        variant="outline-primary"
                        onClick={fetchItems}
                        className="mt-3"
                    >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Tải lại
                    </Button>
                </div>
            );
        }

        return (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4 mb-4">
                {filteredItems.map((itemData) => {
                    const item = itemData.item;
                    const hasPrice = item.price && parseFloat(item.price.naturalAmount) > 0;
                    return (
                        <div key={item.id} className="col">
                            <Card className="h-100 shadow-sm hover-lift">
                                <Card.Img
                                    variant="top"
                                    src={item.imageUrl || '/default-image.jpg'}
                                    alt={item.name}
                                    className="card-img-top object-fit-cover"
                                    style={{ height: '200px' }}
                                />
                                <Card.Body className="d-flex flex-column">
                                    <Card.Title className="fw-bold mb-2">{item.name}</Card.Title>
                                    <Card.Text className="text-muted small mb-3">
                                        {item.description}
                                    </Card.Text>
                                    <div className="mt-auto d-flex justify-content-between align-items-center">
                                        {hasPrice && (
                                            <span className="badge bg-primary rounded-pill px-3 py-2">
                                                {`$${parseFloat(item.price.naturalAmount).toFixed(2)} ${item.price.currencyId}`}
                                            </span>
                                        )}
                                        {isOwnProfile ? (
                                            hasPrice ? (
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleCancelSale(item.id)}
                                                    className="rounded-pill"
                                                >
                                                    Hủy bán
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => openEditModal(item)}
                                                        className="rounded-pill me-2"
                                                    >
                                                        Chỉnh sửa
                                                    </Button>
                                                    <Button
                                                        variant="outline-success"
                                                        size="sm"
                                                        onClick={() => openListingModal(item)}
                                                        className="rounded-pill"
                                                    >
                                                        Đăng bán
                                                    </Button>
                                                </>
                                            )
                                        ) : (
                                            hasPrice && (
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => handleBuyItem(item)}
                                                    className="rounded-pill"
                                                >
                                                    Xem thêm
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </div>
                    );
                })}
            </div>
        );
    };

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

            {renderProductGrid()}

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

            <Modal show={showBuyModal} onHide={() => setShowBuyModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Xem chi tiết <span className="badge bg-info">{selectedItem?.name}</span></Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="row">
                        <div className="col-md-6">
                            <img
                                src={selectedItem?.imageUrl}
                                alt={selectedItem?.name}
                                className="img-fluid rounded shadow-sm mb-3"
                            />
                        </div>
                        <div className="col-md-6">
                            <h5 className="mb-3">Chi tiết sản phẩm</h5>
                            <Card className="mb-3">
                                <Card.Body>
                                    <p><strong>Tên:</strong> {selectedItem?.name}</p>
                                    <p><strong>Mô tả:</strong> {selectedItem?.description || 'Không có mô tả'}</p>
                                    <p><strong>Giá:</strong> ${parseFloat(selectedItem?.price?.naturalAmount || 0).toFixed(2)} {selectedItem?.price?.currencyId}</p>
                                </Card.Body>
                            </Card>

                            {selectedItem?.attributes && selectedItem.attributes.length > 0 && (
                                <Card>
                                    <Card.Header>Thuộc tính</Card.Header>
                                    <Card.Body>
                                        {selectedItem.attributes.map((attr, index) => (
                                            <div key={index} className="d-flex justify-content-between mb-2">
                                                <span className="text-muted">{attr.traitType}</span>
                                                <span className="badge bg-secondary">{attr.value}</span>
                                            </div>
                                        ))}
                                    </Card.Body>
                                </Card>
                            )}

                            {buyError && (
                                <Alert variant="danger" className="mt-3">
                                    {buyError}
                                </Alert>
                            )}
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBuyModal(false)}>
                        Hủy
                    </Button>
                    <Button
                        variant="primary"
                        onClick={buyItemWithPhantomWallet}
                        disabled={buyLoading}
                    >
                        {buyLoading ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Đang xử lý...
                            </>
                        ) : (
                            'Xác nhận mua'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ItemsForSale;
