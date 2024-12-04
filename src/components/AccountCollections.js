import axios from 'axios';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Dropdown, Form, Modal, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { apiKey } from '../api';
import { UserContext } from '../contexts/UserContext';

const COLLECTION_IDS = {
  art: '7709064c-7f03-4891-801f-a2de787a688f',
  images: 'fdd7a4c0-2312-45db-bcc2-ccdea75cc20a',
};

const AccountCollections = ({ referenceId, isOwnProfile, loggedInUserId }) => {
  const [userData] = useContext(UserContext);
  const [activeCollection, setActiveCollection] = useState(COLLECTION_IDS.art);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyError, setBuyError] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingPrice, setListingPrice] = useState('');
  const [listingError, setListingError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchItems = useCallback(async (collectionId, force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchTime < 5000) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('https://api.gameshift.dev/nx/items', {
        params: {
          perPage: 100,
          page: 1,
          collectionId: collectionId,
        },
        headers: {
          accept: 'application/json',
          'x-api-key': apiKey,
        },
      });
      const filteredItems = response.data.data.filter(item => item.item.owner.referenceId === referenceId);

      const hasDataChanged = JSON.stringify(filteredItems) !== JSON.stringify(items);

      if (hasDataChanged) {
        setItems(filteredItems);
        setLastFetchTime(now);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [referenceId, items, lastFetchTime]);

  useEffect(() => {
    fetchItems(activeCollection, true);

    const intervalId = setInterval(() => {
      fetchItems(activeCollection);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeCollection, fetchItems]);

  const handleCollectionChange = (collectionId) => {
    setActiveCollection(collectionId);
    setCurrentPage(1);
    fetchItems(collectionId, true);
  };

  const filteredAndSortedItems = useMemo(() => {
    return items
      .filter(itemData => itemData.item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        if (sortOrder === 'aToZ') {
          return a.item.name.localeCompare(b.item.name);
        } else if (sortOrder === 'zToA') {
          return b.item.name.localeCompare(a.item.name);
        } else if (sortOrder === 'priceLowToHigh') {
          return parseFloat(a.item.price?.naturalAmount || 0) - parseFloat(b.item.price?.naturalAmount || 0);
        } else if (sortOrder === 'priceHighToLow') {
          return parseFloat(b.item.price?.naturalAmount || 0) - parseFloat(a.item.price?.naturalAmount || 0);
        }
        return 0;
      });
  }, [items, searchTerm, sortOrder]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAndSortedItems.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleBuyItem = (item) => {
    setSelectedItem(item);
    setShowBuyModal(true);
    setBuyError(null);
  };

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

      fetchItems(activeCollection, true);
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

      fetchItems(activeCollection, true);
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

  const buyItemWithPhantomWallet = async () => {
    setBuyLoading(true);
    setBuyError(null);

    try {
      const provider = window.phantom?.solana;
      if (!provider || !provider.isConnected) {
        throw new Error("Vui lòng kết nối ví Phantom trước khi mua");
      }

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
      fetchItems(activeCollection, true);
      setShowBuyModal(false);
    } catch (err) {
      console.error('Lỗi mua sản phẩm:', err);
      setBuyError(err.message || 'Không thể thực hiện giao dịch. Vui lòng thử lại.');
    } finally {
      setBuyLoading(false);
    }
  };

  const renderItems = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Đang tải dữ liệu...</p>
        </div>
      );
    }

    if (currentItems.length === 0) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-inbox-fill text-muted" style={{ fontSize: '4rem' }}></i>
          <h2 className="text-muted mt-3">Không có sản phẩm nào</h2>
          <p className="text-muted">Hiện tại chưa có sản phẩm nào trong bộ sưu tập này.</p>
        </div>
      );
    }

    return (
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
        {currentItems.map((itemData) => {
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
                  <div className="mt-auto d-flex justify-content-between align-items-center">
                    {hasPrice ? (
                      <>
                        <span className="badge bg-primary rounded-pill px-3 py-2">
                          ${parseFloat(item.price.naturalAmount).toFixed(2)} {item.price.currencyId}
                        </span>
                        {isOwnProfile ? (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleCancelSale(item.id)}
                            className="rounded-pill"
                          >
                            Hủy bán
                          </Button>
                        ) : (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleBuyItem(item)}
                            className="rounded-pill"
                          >
                            Mua ngay
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="badge bg-secondary rounded-pill px-3 py-2">
                          Chưa có giá
                        </span>
                        {isOwnProfile && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => openListingModal(item)}
                            className="rounded-pill"
                          >
                            Đăng bán
                          </Button>
                        )}
                      </>
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
    <div>
      <h4 className="mb-4">Bộ sưu tập</h4>

      <Tabs
        activeKey={activeCollection}
        onSelect={handleCollectionChange}
        className="mb-4"
      >
        <Tab eventKey={COLLECTION_IDS.art} title="Bộ sưu tập tranh">
          <Row className="mb-3">
            <Col>
              <Card className="border-primary">
                <Card.Body>
                  <Card.Title>Bộ sưu tập tranh</Card.Title>
                  <Card.Text>Khám phá các tác phẩm nghệ thuật độc đáo.</Card.Text>
                  <Button variant="primary">Đang xem</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey={COLLECTION_IDS.images} title="Bộ sưu tập hình ảnh">
          <Row className="mb-3">
            <Col>
              <Card className="border-primary">
                <Card.Body>
                  <Card.Title>Bộ sưu tập hình ảnh</Card.Title>
                  <Card.Text>Khám phá các hình ảnh đẹp trong bộ sưu tập.</Card.Text>
                  <Button variant="primary">Đang xem</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      <div className="mb-4">
        <Row>
          <Col md={6}>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
          <Col md={6}>
            <Dropdown>
              <Dropdown.Toggle variant="outline-secondary" id="dropdown-sort">
                Sắp xếp
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setSortOrder('aToZ')}>A-Z</Dropdown.Item>
                <Dropdown.Item onClick={() => setSortOrder('zToA')}>Z-A</Dropdown.Item>
                <Dropdown.Item onClick={() => setSortOrder('priceLowToHigh')}>Giá thấp đến cao</Dropdown.Item>
                <Dropdown.Item onClick={() => setSortOrder('priceHighToLow')}>Giá cao đến thấp</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </div>

      {error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        renderItems()
      )}

      <div className="d-flex justify-content-center mt-4">
        <Button
          variant="outline-primary"
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Trước
        </Button>
        <span className="mx-3 align-self-center">
          Trang {currentPage} / {Math.ceil(filteredAndSortedItems.length / itemsPerPage)}
        </span>
        <Button
          variant="outline-primary"
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === Math.ceil(filteredAndSortedItems.length / itemsPerPage)}
        >
          Sau
        </Button>
      </div>

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
              'Mua ngay'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

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
    </div>
  );
};

export default AccountCollections;

