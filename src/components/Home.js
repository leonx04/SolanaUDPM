import axios from 'axios';
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { apiKey } from '../api';
// Thành phần Pagination được cải tiến để xử lý các trường hợp edge case
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav>
      <ul className="pagination mb-0">
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            Đầu
          </Button>
        </li>

        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            className="ms-2"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Trước
          </Button>
        </li>

        <li className="page-item mx-2">
          <span className="page-link">
            Trang {currentPage} / {totalPages}
          </span>
        </li>

        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Tiếp
          </Button>
        </li>

        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <Button
            variant="outline-secondary"
            size="sm"
            className="ms-2"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Cuối
          </Button>
        </li>
      </ul>
    </nav>
  );
};

const MarketplaceHome = ({ referenceId }) => {
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalResults: 0,
    perPage: 10,
  });

  // Hàm lọc các sản phẩm
  const filterItems = (itemData) => {
    return (
      itemData.type === 'UniqueAsset' &&
      itemData.item.priceCents !== null &&
      itemData.item.owner.referenceId !== referenceId
    );
  };

  // Lấy toàn bộ danh sách sản phẩm
  const fetchAllItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let allFetchedItems = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await axios.get('https://api.gameshift.dev/nx/items', {
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

        allFetchedItems = [...allFetchedItems, ...response.data.data];
        totalPages = response.data.meta.totalPages;
        page++;
      }

      const filteredItems = allFetchedItems.filter(filterItems);

      setAllItems(filteredItems);
      updatePaginatedItems(filteredItems, pagination.perPage, 1);
    } catch (err) {
      setError('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cập nhật items phân trang
  const updatePaginatedItems = (fullItemsList, perPage, currentPage) => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;

    const paginatedItems = fullItemsList.slice(startIndex, endIndex);

    setItems(paginatedItems);
    setPagination({
      currentPage: currentPage,
      totalPages: Math.ceil(fullItemsList.length / perPage),
      totalResults: fullItemsList.length,
      perPage: perPage,
    });
  };

  // Tải dữ liệu ban đầu
  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  // Xử lý thay đổi số lượng items trên trang
  const handlePerPageChange = (newPerPage) => {
    updatePaginatedItems(allItems, newPerPage, 1);
  };

  // Xử lý chuyển trang
  const handlePageChange = (newPage) => {
    updatePaginatedItems(allItems, pagination.perPage, newPage);
  };

  // Xử lý mở modal mua
  const handleBuyItem = (item) => {
    setSelectedItem(item);
  };

  // Đóng modal
  const closeModal = () => {
    setSelectedItem(null);
    setBuyError(null);
  };

  // Mua item bằng Phantom Wallet
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

      const { transactionId, consentUrl } = response.data;
      window.open(consentUrl, '_blank');
      closeModal();
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

  // Trạng thái tải
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Trạng thái lỗi
  if (error) {
    return (
      <div className="alert alert-danger text-center" role="alert">
        {error}
      </div>
    );
  }

  // Không có sản phẩm
  if (allItems.length === 0) {
    return (
      <div className="container text-center py-5">
        <h2 className="text-muted">Hiện tại chưa có sản phẩm nào để mua</h2>
        <p className="lead">Vui lòng quay lại sau</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-5 ">
      <div className="container">
        <h1 className="text-center mb-5 display-4 fw-bold text-primary">
          Marketplace Unique Assets
        </h1>

        {/* Phần điều khiển phân trang và số lượng hiển thị */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center">
            <span className="me-3">
              Hiển thị: {items.length} / {pagination.totalResults} sản phẩm
            </span>
            <Form.Select
              size="sm"
              style={{ width: 'auto' }}
              value={pagination.perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
            >
              {[5, 10, 20, 50].map((num) => (
                <option key={num} value={num}>
                  {num} sản phẩm/trang
                </option>
              ))}
            </Form.Select>
          </div>

          {/* Thành phần Pagination */}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Danh sách sản phẩm */}
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {items.map((itemData) => {
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
                    <Card.Text
                      className="theme-text text-muted mb-2"
                      style={{ minHeight: '60px' }}
                    >
                      {item.description || 'Không có mô tả'}
                    </Card.Text>

                    <div className="d-flex justify-content-between align-items-center mt-auto">
                      <div>
                        <span className="badge bg-primary">
                          {`$${(item.priceCents / 100).toFixed(2)} USDC`}
                        </span>
                      </div>
                      <Button
                        variant="outline-primary"
                        onClick={() => handleBuyItem(item)}
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

      {/* Modal mua hàng */}
      {selectedItem && (
        <Modal show={!!selectedItem} onHide={closeModal}>
          <Modal.Header closeButton>
            <Modal.Title>Xác nhận mua {selectedItem.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center">
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.name}
                className="img-fluid mb-3 rounded"
                style={{ maxHeight: '300px' }}
              />
              <p>Bạn có chắc chắn muốn mua sản phẩm này?</p>
              <p className="fw-bold">
                Giá: ${(selectedItem.priceCents / 100).toFixed(2)} USDC
              </p>

              {buyError && (
                <Alert variant="danger" className="mt-3">
                  {buyError}
                </Alert>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal} disabled={buyLoading}>
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