import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Alert, Button, Card, Carousel, Form, Modal, Spinner, InputGroup } from 'react-bootstrap';
import { apiKey } from '../api';

// Pagination component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSide = Math.floor((maxPagesToShow - 3) / 2);

    if (currentPage <= maxPagesToShow - 2) {
      return [
        ...Array.from({ length: maxPagesToShow - 1 }, (_, i) => i + 1),
        '...',
        totalPages
      ];
    }

    if (currentPage > totalPages - (maxPagesToShow - 2)) {
      return [
        1,
        '...',
        ...Array.from({ length: maxPagesToShow - 1 }, (_, i) =>
          totalPages - (maxPagesToShow - 2) + i
        )
      ];
    }

    return [
      1,
      '...',
      ...Array.from({ length: maxPagesToShow - 2 }, (_, i) =>
        currentPage - leftSide + i
      ),
      '...',
      totalPages
    ];
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav>
      <ul className="pagination mb-0 justify-content-center">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &#10094; Trước
          </Button>
        </li>

        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <li key={`ellipsis-${index}`} className="page-item">
                <span className="page-link text-muted">...</span>
              </li>
            );
          }

          return (
            <li
              key={page}
              className={`page-item ${currentPage === page ? 'active' : ''}`}
            >
              <Button
                variant={currentPage === page ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => onPageChange(page)}
                className="mx-1"
              >
                {page}
              </Button>
            </li>
          );
        })}

        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Tiếp &#10095;
          </Button>
        </li>
      </ul>
    </nav>
  );
};

// Main MarketplaceHome component
const MarketplaceHome = ({ referenceId }) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(Date.now());

  // New state for filtering and sorting
  const [sortOrder, setSortOrder] = useState('default');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const productSectionRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredItems = useMemo(() => {
    return allItems.filter(itemData =>
      itemData.type === 'UniqueAsset' &&
      itemData.item.priceCents !== null &&
      itemData.item.owner.referenceId !== referenceId &&
      itemData.item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (priceRange.min === '' || itemData.item.priceCents >= priceRange.min * 100) &&
      (priceRange.max === '' || itemData.item.priceCents <= priceRange.max * 100)
    ).sort((a, b) => {
      if (sortOrder === 'highToLow') {
        return b.item.priceCents - a.item.priceCents;
      } else if (sortOrder === 'lowToHigh') {
        return a.item.priceCents - b.item.priceCents;
      }
      return 0;
    });
  }, [allItems, referenceId, searchQuery, priceRange, sortOrder]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const fetchAllItems = useCallback(async (signal) => {
    setLoading(true);
    setError(null);

    try {
      const fetchPage = async (page) => {
        const response = await axios.get('https://api.gameshift.dev/nx/items', {
          signal,
          params: {
            perPage: 100,
            page: page,
            collectionId: 'bbe92f30-9a6a-46ce-90c5-17fd1ad6e0dc',
          },
          headers: {
            accept: 'application/json',
            'x-api-key': apiKey,
          },
        });
        return response.data;
      };

      let allFetchedItems = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const { data, meta } = await fetchPage(page);
        allFetchedItems.push(...data);
        totalPages = meta.totalPages;
        page++;
      }

      const hasChanged = JSON.stringify(allFetchedItems) !== JSON.stringify(allItems);

      if (hasChanged) {
        setAllItems(allFetchedItems);
        setLastFetchTime(Date.now());
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled', err.message);
      } else {
        setError('Không thể tải danh sách sản phẩm: ' + err.message);
        console.error('Fetch error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [allItems]);

  const handleManualRefresh = () => {
    fetchAllItems();
    setSearchQuery('');
    setSortOrder('default');
    setPriceRange({ min: '', max: '' });
    setCurrentPage(1);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchAllItems();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchAllItems]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllItems(controller.signal);
    return () => controller.abort();
  }, [fetchAllItems]);

  const handleBuyItem = async (itemData) => {
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
      fetchAllItems();
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

  const scrollToProducts = () => {
    productSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        {error}
        <Button
          variant="outline-primary"
          className="ms-3"
          onClick={() => fetchAllItems()}
        >
          Thử lại
        </Button>
      </Alert>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="container text-center py-5">
        <h2 className="text-muted">Hiện tại chưa có sản phẩm nào để mua</h2>
        <Button
          variant="primary"
          onClick={() => fetchAllItems()}
        >
          Tải lại
        </Button>
      </div>
    );
  }

  return (
    <div className="marketplace-home">
      <header className="hero-section text-center py-5 mb-5">
        <h1 className="display-4 fw-bold text-primary mb-3">Khám phá NFT độc đáo</h1>
        <p className="lead mb-4">Sở hữu những tác phẩm nghệ thuật số độc nhất và tiên phong trong thế giới metaverse.</p>
        <Button variant="primary" size="lg" className="rounded-pill px-4 py-2" onClick={scrollToProducts}>Khám phá ngay</Button>
      </header>

      <div className="container mb-5">
        <Carousel className="rounded-lg overflow-hidden shadow-lg">
          <Carousel.Item>
            <img
              className="d-block w-100"
              src="https://static.vecteezy.com/system/resources/previews/017/797/790/non_2x/banner-for-nft-industry-one-point-perspective-concept-with-terms-of-web3-vector.jpg"
              alt="NFT Collection"
            />
            <Carousel.Caption>
              <h3>Bộ sưu tập NFT độc quyền</h3>
              <p>Khám phá những tác phẩm nghệ thuật số độc đáo nhất.</p>
            </Carousel.Caption>
          </Carousel.Item>
          <Carousel.Item>
            <img
              className="d-block w-100"
              src="https://static.vecteezy.com/system/resources/previews/023/325/782/non_2x/futuristic-digital-technology-metaverse-nft-virtual-reality-concept-young-girl-wearing-vr-virtual-reality-goggle-experiencing-virtual-world-glitch-effect-vector.jpg"
              alt="Metaverse Experience"
            />
            <Carousel.Caption>
              <h3>Trải nghiệm Metaverse</h3>
              <p>Bước vào thế giới ảo với NFT của bạn.</p>
            </Carousel.Caption>
          </Carousel.Item>
        </Carousel>
      </div>

      <div className="container" ref={productSectionRef}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">Sản phẩm nổi bật</h2>
          <div className="d-flex align-items-center">
            <small className="text-muted me-3">
              Cập nhật lần cuối: {new Date(lastFetchTime).toLocaleString()}
            </small>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleManualRefresh}
              className="rounded-circle"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </Button>
          </div>
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
                  onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                />
                <InputGroup.Text>-</InputGroup.Text>
                <Form.Control
                  type="number"
                  placeholder="Đến"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
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
                      Tác giả: {item.owner.referenceId}
                    </Card.Text>
                    <div className="mt-auto d-flex justify-content-between align-items-center">
                      <span className="badge bg-primary rounded-pill px-3 py-2">
                        {`$${(item.priceCents / 100).toFixed(2)} USDC`}
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

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            Hiển thị: {paginatedItems.length} / {filteredItems.length} sản phẩm
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
          <Form.Select
            size="sm"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="w-auto"
          >
            {[5, 10, 20, 50].map((num) => (
              <option key={num} value={num}>
                {num} sản phẩm/trang
              </option>
            ))}
          </Form.Select>
        </div>
      </div>

      {selectedItem && (
        <Modal show={!!selectedItem} onHide={() => setSelectedItem(null)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>Xác nhận mua {selectedItem.name}</Modal.Title>
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
                    <p><strong>Giá:</strong> ${(selectedItem.priceCents / 100).toFixed(2)} USDC</p>
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
                'Xác nhận mua'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      )}

      <section className="roadmap-section py-5 bg-light">
        <div className="container">
          <h2 className="text-center fw-bold mb-5">Lộ trình phát triển</h2>
          <div className="row g-4">
            {[
              { title: "Giai đoạn 1", description: "Phát triển cơ sở hạ tầng và tích hợp Blockchain." },
              { title: "Giai đoạn 2", description: "Ra mắt bộ sưu tập NFT đầu tiên và hợp tác đối tác." },
              { title: "Giai đoạn 3", description: "Mở rộng cộng đồng và triển khai tính năng mới." },
              { title: "Giai đoạn 4", description: "Tích hợp Metaverse và trải nghiệm thực tế ảo." }
            ].map((stage, index) => (
              <div key={index} className="col-md-3">
                <Card className="h-100 text-center border-0 shadow-sm">
                  <Card.Body>
                    <div className="display-4 mb-3 text-primary">{index + 1}</div>
                    <h5 className="card-title fw-bold">{stage.title}</h5>
                    <p className="card-text">{stage.description}</p>
                  </Card.Body>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MarketplaceHome;

