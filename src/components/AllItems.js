import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, InputGroup, Modal, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'react-feather';
import { Link } from 'react-router-dom';
import { apiKey } from '../api';

const COLLECTION_IDS = {
    art: '7709064c-7f03-4891-801f-a2de787a688f',
    images: 'fdd7a4c0-2312-45db-bcc2-ccdea75cc20a',
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const maxVisiblePages = 5;
    const pageNumbers = [];

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="d-flex justify-content-center align-items-center">
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="me-1"
            >
                <ChevronsLeft size={14} />
            </Button>
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="me-1"
            >
                <ChevronLeft size={14} />
            </Button>
            {startPage > 1 && (
                <>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => onPageChange(1)}
                        className="me-1"
                    >
                        1
                    </Button>
                    {startPage > 2 && <span className="mx-1">...</span>}
                </>
            )}
            {pageNumbers.map((number) => (
                <Button
                    key={number}
                    variant={currentPage === number ? 'primary' : 'outline-secondary'}
                    size="sm"
                    onClick={() => onPageChange(number)}
                    className="me-1"
                >
                    {number}
                </Button>
            ))}
            {endPage < totalPages && (
                <>
                    {endPage < totalPages - 1 && <span className="mx-1">...</span>}
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => onPageChange(totalPages)}
                        className="me-1"
                    >
                        {totalPages}
                    </Button>
                </>
            )}
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="me-1"
            >
                <ChevronRight size={14} />
            </Button>
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
            >
                <ChevronsRight size={14} />
            </Button>
        </div>
    );
};

const AllItems = ({ referenceId }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('default');
    const [priceRange, setPriceRange] = useState({ min: '', max: '' });
    const [activeCollection, setActiveCollection] = useState(COLLECTION_IDS.art);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);
    const [selectedItem, setSelectedItem] = useState(null);
    const [buyLoading, setBuyLoading] = useState(false);
    const [buyError, setBuyError] = useState(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get('https://api.gameshift.dev/nx/items', {
                params: {
                    perPage: 100,
                    collectionId: activeCollection,
                },
                headers: {
                    accept: 'application/json',
                    'x-api-key': apiKey,
                },
            });
            setItems(response.data.data);
        } catch (err) {
            setError('Không thể tải danh sách sản phẩm: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [activeCollection]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const filteredItems = useMemo(() => {
        return items.filter(itemData =>
            itemData.type === 'UniqueAsset' &&
            itemData.item.price &&
            itemData.item.price.naturalAmount !== null &&
            parseFloat(itemData.item.price.naturalAmount) > 0 &&
            itemData.item.owner.referenceId !== referenceId &&
            itemData.item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            (priceRange.min === '' || parseFloat(itemData.item.price.naturalAmount) >= priceRange.min) &&
            (priceRange.max === '' || parseFloat(itemData.item.price.naturalAmount) <= priceRange.max)
        ).sort((a, b) => {
            if (sortOrder === 'highToLow') {
                return parseFloat(b.item.price.naturalAmount) - parseFloat(a.item.price.naturalAmount);
            } else if (sortOrder === 'lowToHigh') {
                return parseFloat(a.item.price.naturalAmount) - parseFloat(b.item.price.naturalAmount);
            }
            return 0;
        });
    }, [items, referenceId, searchQuery, priceRange, sortOrder]);

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo(0, 0);
    };

    const handleBuyItem = (itemData) => {
        setSelectedItem(itemData.item);
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

            const response = await axios.post(
                `https://api.gameshift.dev/nx/unique-assets/${selectedItem.id}/buy`,
                {
                    buyerId: referenceId
                },
                {
                    headers: {
                        'accept': 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': apiKey
                    }
                }
            );

            const { consentUrl } = response.data;
            window.open(consentUrl, '_blank');
            fetchItems();
        } catch (err) {
            console.error('Lỗi mua sản phẩm:', err);

            const errorMessage = err.response?.data?.message ||
                err.message ||
                'Không thể thực hiện giao dịch. Vui lòng thử lại.';

            setBuyError(errorMessage);
        } finally {
            setBuyLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <div className="all-items-container">
            <h2 className="mb-4">Tất cả sản phẩm</h2>

            <div className="mb-4">
                <Button
                    variant={activeCollection === COLLECTION_IDS.art ? "primary" : "outline-primary"}
                    className="me-2"
                    onClick={() => setActiveCollection(COLLECTION_IDS.art)}
                >
                    Bộ sưu tập tranh
                </Button>
                <Button
                    variant={activeCollection === COLLECTION_IDS.images ? "primary" : "outline-primary"}
                    onClick={() => setActiveCollection(COLLECTION_IDS.images)}
                >
                    Bộ sưu tập hình ảnh
                </Button>
            </div>

            <Form className="mb-4">
                <div className="row g-3">
                    <div className="col-md-4">
                        <InputGroup>
                            <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="Tìm kiếm sản phẩm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </InputGroup>
                    </div>
                    <div className="col-md-3">
                        <Form.Select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="default">Sắp xếp mặc định</option>
                            <option value="lowToHigh">Giá: Thấp đến Cao</option>
                            <option value="highToLow">Giá: Cao đến Thấp</option>
                        </Form.Select>
                    </div>
                    <div className="col-md-5">
                        <InputGroup>
                            <InputGroup.Text>Khoảng giá</InputGroup.Text>
                            <Form.Control
                                type="number"
                                placeholder="Từ"
                                value={priceRange.min}
                                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                            />
                            <InputGroup.Text>-</InputGroup.Text>
                            <Form.Control
                                type="number"
                                placeholder="Đến"
                                value={priceRange.max}
                                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                            />
                        </InputGroup>
                    </div>
                </div>
            </Form>

            <div className="row row-cols-1 row-cols-md-3 g-4 mb-4">
                {paginatedItems.map((itemData) => {
                    const item = itemData.item;
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
                                        Tác giả:
                                        <OverlayTrigger
                                            placement="top" // Vị trí của tooltip
                                            overlay={
                                                <Tooltip id={`tooltip-${item.owner.referenceId}`}>
                                                    Nhấn để xem trang cá nhân của {item.owner.referenceId}
                                                </Tooltip>
                                            }
                                        >
                                            <Link
                                                className="text-decoration-none badge badge-success"
                                                to={`/account/${item.owner.referenceId}`}
                                            >
                                                <i className="bi bi-person-circle me-1"></i> {item.owner.referenceId}
                                            </Link>
                                        </OverlayTrigger>
                                    </Card.Text>
                                    <div className="mt-auto d-flex justify-content-between align-items-center">
                                        <span className="badge bg-primary rounded-pill px-3 py-2">
                                            {`$${parseFloat(item.price.naturalAmount).toFixed(2)} ${item.price.currencyId}`}
                                        </span>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleBuyItem(itemData)}
                                            className="rounded-pill"
                                        >
                                            Mua ngay
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </div>
                    );
                })}
            </div>

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4">
                <div className="mb-3 mb-md-0">
                    Hiển thị: {paginatedItems.length} / {filteredItems.length} sản phẩm
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
                <Form.Select
                    className="ms-md-3 mt-3 mt-md-0"
                    style={{ width: 'auto' }}
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                    {[9, 18, 36, 72].map((num) => (
                        <option key={num} value={num}>
                            {num} sản phẩm/trang
                        </option>
                    ))}
                </Form.Select>
            </div>

            {selectedItem && (
                <Modal show={!!selectedItem} onHide={() => setSelectedItem(null)} size="lg" centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Mua ngay <span className="badge bg-info">{selectedItem.name}</span></Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="row">
                            <div className="col-md-6">
                                <img
                                    src={selectedItem.imageUrl}
                                    alt={selectedItem.name}
                                    className="img-fluid rounded shadow-sm mb-3"
                                />
                            </div>
                            <div className="col-md-6">
                                <h5 className="mb-3">Chi tiết sản phẩm</h5>
                                <Card className="mb-3">
                                    <Card.Body>
                                        <p><strong>Tên:</strong> {selectedItem.name}</p>
                                        <p><strong>Mô tả:</strong> {selectedItem.description || 'Không có mô tả'}</p>
                                        <p><strong>Giá:</strong> ${parseFloat(selectedItem.price.naturalAmount).toFixed(2)} {selectedItem.price.currencyId}</p>
                                    </Card.Body>
                                </Card>

                                {selectedItem.attributes && selectedItem.attributes.length > 0 && (
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
                        <Button variant="secondary" onClick={() => setSelectedItem(null)}>
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
                                'Mua ngay'
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            )}
        </div>
    );
};

export default AllItems;

