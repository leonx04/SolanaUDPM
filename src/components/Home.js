import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { apiKey } from '../api';

const usePagination = (items, initialPerPage = 10) => {
  const [pagination, setPagination] = useState({
    currentPage: 1,
    perPage: initialPerPage,
    totalPages: 0,
    totalResults: 0
  });

  const paginatedItems = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;

    return {
      currentItems: items.slice(startIndex, endIndex),
      totalPages: Math.ceil(items.length / pagination.perPage),
      totalResults: items.length
    };
  }, [items, pagination.currentPage, pagination.perPage]);

  const changePage = useCallback((newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  }, []);

  const changePerPage = useCallback((newPerPage) => {
    setPagination(prev => ({
      ...prev,
      perPage: newPerPage,
      currentPage: 1
    }));
  }, []);

  return {
    ...pagination,
    currentItems: paginatedItems.currentItems,
    totalPages: paginatedItems.totalPages,
    totalResults: paginatedItems.totalResults,
    changePage,
    changePerPage
  };
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Hàm tạo danh sách các trang để hiển thị
  const getPageNumbers = () => {
    const maxPagesToShow = 5; // Số trang tối đa hiển thị

    // Nếu tổng số trang nhỏ hơn maxPagesToShow, hiển thị hết
    if (totalPages <= maxPagesToShow) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Logic để hiển thị các trang một cách thông minh
    const leftSide = Math.floor((maxPagesToShow - 3) / 2);

    // Nếu trang hiện tại ở đầu
    if (currentPage <= maxPagesToShow - 2) {
      return [
        ...Array.from({ length: maxPagesToShow - 1 }, (_, i) => i + 1),
        '...',
        totalPages
      ];
    }

    // Nếu trang hiện tại ở cuối
    if (currentPage > totalPages - (maxPagesToShow - 2)) {
      return [
        1,
        '...',
        ...Array.from({ length: maxPagesToShow - 1 }, (_, i) =>
          totalPages - (maxPagesToShow - 2) + i
        )
      ];
    }

    // Các trường hợp ở giữa
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
        {/* Nút Previous */}
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

        {/* Các nút số trang */}
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

        {/* Nút Next */}
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

const MarketplaceHome = ({ referenceId }) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);

  const [lastFetchTime, setLastFetchTime] = useState(Date.now());

  // Interval để tự động fetch dữ liệu (mỗi 30 giây)
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchAllItems();
    }, 30000); // 30 giây

    // Cleanup interval khi component bị hủy
    return () => clearInterval(intervalId);
  }, []);


  // Memoized filter function
  const filteredItems = useMemo(() => {
    return allItems.filter(itemData =>
      itemData.type === 'UniqueAsset' &&
      itemData.item.priceCents !== null &&
      itemData.item.owner.referenceId !== referenceId
    );
  }, [allItems, referenceId]);

  // Optimized fetch function with cancellation
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

      // So sánh dữ liệu mới với dữ liệu cũ
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

  // Fetch data with cleanup
  useEffect(() => {
    const controller = new AbortController();
    fetchAllItems(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchAllItems]);

  // Thêm nút làm mới thủ công
  const handleManualRefresh = () => {
    fetchAllItems();
  };

  // Fetch data with cleanup
  useEffect(() => {
    const controller = new AbortController();
    fetchAllItems(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchAllItems]);

  // Pagination hook
  const {
    currentItems,
    currentPage,
    totalPages,
    totalResults,
    perPage,
    changePage,
    changePerPage
  } = usePagination(filteredItems);

  // Buy item handler
  const handleBuyItem = async (itemData) => {
    // Thay vì để trực tiếp itemData, hãy trích xuất item
    setSelectedItem(itemData.item);
    setBuyError(null);
  };

  // Buy with Phantom Wallet
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

      // Bỏ qua transactionId, chỉ sử dụng consentUrl
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

  // Render loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Render error state
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

  // Render empty state
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
    <div className="container-fluid py-5">
      <div className="container">
        <h1 className="text-center mb-5 display-4 fw-bold text-primary">
          Trang chủ
        </h1>
        {/* Thêm thông báo thời gian cập nhật cuối cùng */}
        <div className="text-center mb-3">
          <small className="text-muted">
            Cập nhật lần cuối: {new Date(lastFetchTime).toLocaleString()}
            <Button
              variant="link"
              size="sm"
              onClick={handleManualRefresh}
              className="ms-2 btn btn-primary btn-sm text-decoration-none text-light"
            >
              Làm mới ngay
            </Button>
          </small>
        </div>

        {/* Pagination and display controls */}
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-4 d-flex align-items-center justify-content-between justify-content-md-start">
            <span className="me-3 text-nowrap">
              Hiển thị: {currentItems.length} / {totalResults} sản phẩm
            </span>
            <Form.Select
              size="sm"
              style={{ width: 'auto' }}
              value={perPage}
              onChange={(e) => changePerPage(Number(e.target.value))}
              className="d-md-none d-block"
            >
              {[5, 10, 20, 50].map((num) => (
                <option key={num} value={num}>
                  {num} sản phẩm/trang
                </option>
              ))}
            </Form.Select>
          </div>

          <div className="col-12 col-md-4 d-flex justify-content-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={changePage}
            />
          </div>

          <div className="col-12 col-md-4 d-none d-md-block text-end">
            <Form.Select
              size="sm"
              style={{ width: 'auto', float: 'right' }}
              value={perPage}
              onChange={(e) => changePerPage(Number(e.target.value))}
            >
              {[5, 10, 20, 50].map((num) => (
                <option key={num} value={num}>
                  {num} sản phẩm/trang
                </option>
              ))}
            </Form.Select>
          </div>
        </div>


        {/* Product grid */}
        <div className="row row-cols-1 row-cols-md-3 g-4 mt-2">
          {currentItems.map((itemData) => {
            const item = itemData.item;
            return (
              <div key={item.id} className="col">
                <Card className="h-100 d-flex flex-column shadow-sm hover-lift">
                  <Card.Img
                    variant="top"
                    src={item.imageUrl || '/default-image.jpg'}
                    alt={item.name || 'Hình ảnh sản phẩm'}
                    className="card-img-top"
                    style={{
                      width: '100%',
                      height: 'auto',
                      aspectRatio: '16/9',
                      objectFit: 'cover',
                    }}
                  />
                  <Card.Body style={{ flex: 1 }}>
                    <Card.Title className="fw-bold">{item.name}</Card.Title>
                    <Card.Text className="text-muted">
                      Tác giả: {item.owner.referenceId}
                    </Card.Text>

                    <div className="d-flex justify-content-between align-items-center mt-auto">
                      <div>
                        <span className="badge bg-primary">
                          {`$${(item.priceCents / 100).toFixed(2)} USDC`}
                        </span>
                      </div>
                      <Button
                        variant="outline-primary"
                        onClick={() => handleBuyItem(itemData)}
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
      </div>
      {/* Purchase Confirmation Modal */}
      {selectedItem && (
        <Modal show={!!selectedItem} onHide={() => setSelectedItem(null)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Xác nhận mua {selectedItem.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6">
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="img-fluid mb-3 rounded"
                  style={{ maxHeight: '300px', width: '100%', objectFit: 'cover' }}
                />
              </div>
              <div className="col-md-6">
                <h5 className="mb-3">Chi tiết sản phẩm</h5>
                <div className="card mb-3">
                  <div className="card-body">
                    <p className="card-text">
                      <strong>Tên:</strong> {selectedItem.name}
                    </p>
                    <p className="card-text">
                      <strong>Mô tả:</strong> {selectedItem.description || 'Không có mô tả'}
                    </p>
                    <p className="card-text">
                      <strong>Giá:</strong> ${(selectedItem.priceCents / 100).toFixed(2)} USDC
                    </p>
                  </div>
                </div>

                {selectedItem.attributes && selectedItem.attributes.length > 0 && (
                  <div className="card">
                    <div className="card-header">Thuộc tính</div>
                    <ul className="list-group list-group-flush">
                      {selectedItem.attributes.map((attr, index) => (
                        <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <span className="text-muted">{attr.traitType}</span>
                          <span className="badge bg-primary rounded-pill">{attr.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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
            <Button variant="secondary" onClick={() => setSelectedItem(null)} disabled={buyLoading}>
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
    </div>
  );
};

export default MarketplaceHome;