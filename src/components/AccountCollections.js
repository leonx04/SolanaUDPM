import axios from 'axios';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Dropdown, Form, Modal, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { apiKey } from '../api';
import { UserContext } from '../contexts/UserContext';

const COLLECTION_IDS = {
  art: '35fe7ca2-e2ce-4df5-b24c-5040c6f0d186',
  images: 'fba8b4c9-5a04-466c-b609-6532cbd6d9d1',
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
  const [itemsPerPage] = useState(9); // 3 items per row, 3 rows
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyError, setBuyError] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const fetchItems = useCallback(async (collectionId, force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchTime < 5000) {
      // If not forced and less than 5 seconds since last fetch, skip
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
      // Filter items based on the referenceId
      const filteredItems = response.data.data.filter(item => item.item.owner.referenceId === referenceId);
      
      // Check if data has changed
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
    
    // Set up polling for real-time updates
    const intervalId = setInterval(() => {
      fetchItems(activeCollection);
    }, 10000); // Poll every 10 seconds

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

  const handleListForSale = (item) => {
    // Placeholder for listing item for sale
    console.log('Listing item for sale:', item);
    // TODO: Implement the actual listing logic
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
                    Tác giả: <Link className="text-decoration-none badge badge-success" to={`/account/${item.owner.referenceId}`}>{item.owner.referenceId}</Link>
                  </Card.Text>
                  <div className="mt-auto d-flex justify-content-between align-items-center">
                    {item.price ? (
                      <>
                        <span className="badge bg-primary rounded-pill px-3 py-2">
                          ${parseFloat(item.price.naturalAmount).toFixed(2)} {item.price.currencyId}
                        </span>
                        {isOwnProfile ? (
                          <Button
                            variant="outline-danger"
                            size="sm"
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
                            onClick={() => handleListForSale(item)}
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
        <Tab eventKey={COLLECTION_IDS.art} title="Bộ sưu tập nghệ thuật">
          <Row className="mb-3">
            <Col>
              <Card className="border-primary">
                <Card.Body>
                  <Card.Title>Bộ sưu tập nghệ thuật</Card.Title>
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
              'Xác nhận mua'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AccountCollections;

