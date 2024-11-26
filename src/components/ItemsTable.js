import React, { useState, useEffect } from 'react';
import { apiKey } from '../api';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

const ItemsTable = ({ ownerReferenceId }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Các state mới cho việc liệt kê bán
    const [selectedItem, setSelectedItem] = useState(null);
    const [listingPrice, setListingPrice] = useState('');
    const [showListingModal, setShowListingModal] = useState(false);
    const [listingError, setListingError] = useState(null);
    const [isListing, setIsListing] = useState(false);

    // State mới cho việc lọc thị trường
    const [marketFilter, setMarketFilter] = useState('all');

    const fetchItems = async () => {
        setLoading(true);
        setError(null);

        try {
            let url = `https://api.gameshift.dev/nx/items`;

            // Thêm tham số lọc dựa trên trạng thái thị trường
            const params = new URLSearchParams();
            if (ownerReferenceId) {
                params.append('ownerReferenceId', ownerReferenceId);
            }

            switch (marketFilter) {
                case 'forSale':
                    params.append('forSale', 'true');
                    break;
                case 'notForSale':
                    params.append('forSale', 'false');
                    break;
            }

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
            setError('Lỗi khi tải items: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [ownerReferenceId, marketFilter]);

    const handleListForSale = async () => {
        if (!selectedItem || !listingPrice) {
            setListingError('Vui lòng nhập giá hợp lệ');
            return;
        }

        setIsListing(true);
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

            // Điều hướng người dùng đến URL đồng ý
            if (data.consentUrl) {
                window.location.href = data.consentUrl;
            }

            // Làm mới danh sách sau khi liệt kê
            fetchItems();
        } catch (err) {
            setListingError(err.message);
        } finally {
            setIsListing(false);
            setShowListingModal(false);
        }
    };

    const openListingModal = (item) => {
        setSelectedItem(item);
        setListingPrice('');
        setListingError(null);
        setShowListingModal(true);
    };

    // Hàm để rút gọn text
    const truncateText = (text, maxLength) => {
        if (!text) return '-';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <div className="card w-100">
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

            <div className="card-body p-0">
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
                                <tbody>
                                    {items.map((itemData, index) => {
                                        const { type, item } = itemData;
                                        return (
                                            <tr key={index}>
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
                                                <td>
                                                    {type === 'UniqueAsset' && !item.forSale && (
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            onClick={() => openListingModal(item)}
                                                        >
                                                            Liệt Kê Bán
                                                        </Button>
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

            {/* Modal Liệt Kê Bán */}
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
                    <Button
                        variant="secondary"
                        onClick={() => setShowListingModal(false)}
                        disabled={isListing}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleListForSale}
                        disabled={isListing || !listingPrice}
                    >
                        {isListing ? 'Đang Xử Lý...' : 'Liệt Kê Bán'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ItemsTable;