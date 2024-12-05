import React, { useCallback, useEffect, useState } from "react";
import { Button, Form, InputGroup, Modal, Pagination } from "react-bootstrap";
import { useInView } from 'react-intersection-observer';
import useSWR from 'swr';
import { apiKey } from '../api';
import '../App.css';

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-api-key": apiKey,
    },
  });
  if (!response.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return response.json();
};

const PurchaseHistory: React.FC<{ referenceId: string }> = ({ referenceId }) => {
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [imageToShow, setImageToShow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { data, error, mutate } = useSWR(
    "https://api.gameshift.dev/nx/payments",
    fetcher
  );

  const { ref, inView } = useInView({
    threshold: 0,
  });

  // const checkTransactionStatus = useCallback(async (paymentId: string) => {
  //   const response = await fetch(
  //     `https://api.gameshift.dev/nx/payments/${paymentId}`,
  //     {
  //       headers: {
  //         accept: "application/json",
  //         "x-api-key": apiKey,
  //       },
  //     }
  //   );
  //   if (!response.ok) {
  //     throw new Error("Không thể kiểm tra trạng thái giao dịch.");
  //   }
  //   const data = await response.json();
  //   return data.status;
  // }, []);

  const applyFiltersAndSearch = useCallback(() => {
    if (!data || !data.data) return;

    let result = data.data.filter(
      (purchase) => purchase.purchaser.referenceId === referenceId
    );

    if (statusFilter !== 'Tất cả') {
      result = result.filter(purchase => purchase.status === statusFilter);
    }

    if (searchTerm) {
      result = result.filter(purchase =>
        purchase.sku.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.sku.item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPurchases(result);
    setCurrentPage(1);
  }, [data, referenceId, statusFilter, searchTerm]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  useEffect(() => {
    if (inView) {
      mutate();
    }
  }, [inView, mutate]);

  const handleViewDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPurchase(null);
  };

  const handleImageClick = (imageUrl) => {
    setImageToShow(imageUrl);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPurchases.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  const renderPaginationItems = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pageNumbers.push(
        <Pagination.First key="first" onClick={() => paginate(1)} />,
        <Pagination.Ellipsis key="ellipsis-start" />
      );
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <Pagination.Item
          key={i}
          active={i === currentPage}
          onClick={() => paginate(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      pageNumbers.push(
        <Pagination.Ellipsis key="ellipsis-end" />,
        <Pagination.Last key="last" onClick={() => paginate(totalPages)} />
      );
    }

    return pageNumbers;
  };

  if (error) return <div className="alert alert-danger">Failed to load purchase history.</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="card" style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
      <div className="card-header">
        <h5>Lịch Sử Mua Hàng</h5>
        <div className="d-flex flex-wrap gap-2 align-items-center mt-2">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm theo tên hoặc mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Tất cả">Tất cả</option>
            <option value="Confirmed">Đã xác nhận</option>
            <option value="Pending">Đang chờ</option>
            <option value="Expired">Hết hạn</option>
            <option value="Completed">Hoàn thành</option>
          </Form.Select>
          <Form.Select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={5}>5 items</option>
            <option value={10}>10 items</option>
            <option value={20}>20 items</option>
            <option value={50}>50 items</option>
          </Form.Select>
          <Button
            className="btn btn-primary btn-sm"
            onClick={() => mutate()}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </Button>
        </div>
      </div>
      <div className="card-body">
        <table className="table table-responsive table-hover">
          <thead>
            <tr>
              <th>#</th>
              <th>Ảnh</th>
              <th>Sản phẩm</th>
              <th>Mô tả</th>
              <th>Giá</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((purchase, index) => (
              <tr key={purchase.id}>
                <td>{indexOfFirstItem + index + 1}</td>
                <td>
                  <img
                    src={purchase.sku.item.imageUrl}
                    alt={purchase.sku.item.name}
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "cover",
                      cursor: "pointer",
                      borderRadius: '4px'
                    }}
                    onClick={() => handleImageClick(purchase.sku.item.imageUrl)}
                  />
                </td>
                <td>{purchase.sku.item.name}</td>
                <td>{purchase.sku.item.description}</td>
                <td>{purchase.price.naturalAmount} USDC</td>
                <td>
                  {new Date(purchase.sku.item.created).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'UTC'
                  })}
                </td>
                <td>
                  <span
                    className={`badge ${
                      purchase.status === "Confirmed"
                        ? "bg-success"
                        : purchase.status === "Pending"
                        ? "bg-warning"
                        : purchase.status === "Expired"
                        ? "bg-danger"
                        : "bg-secondary"
                    }`}
                  >
                    {purchase.status}
                  </span>
                </td>
                <td>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleViewDetails(purchase)}
                  >
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPurchases.length === 0 && (
          <div className="text-center text-muted py-3">
            Không có giao dịch nào phù hợp
          </div>
        )}
        {filteredPurchases.length > 0 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="text-muted">
              Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredPurchases.length)}{' '}
              trong tổng số {filteredPurchases.length} giao dịch
            </div>
            <Pagination>{renderPaginationItems()}</Pagination>
          </div>
        )}
      </div>
      <div ref={ref} style={{ height: '1px' }} /> {/* Intersection Observer target */}
      {selectedPurchase && (
        <Modal show={showModal} onHide={handleCloseModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>Chi tiết đơn hàng</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center">
              <img
                src={selectedPurchase.sku.item.imageUrl}
                alt={selectedPurchase.sku.item.name}
                style={{
                  width: "100%",
                  maxHeight: "400px",
                  objectFit: "cover",
                  borderRadius: "8px",
                  marginBottom: "15px",
                }}
              />
            </div>
            <p><strong>Sản phẩm:</strong> {selectedPurchase.sku.item.name}</p>
            <p><strong>Mô tả:</strong> {selectedPurchase.sku.item.description}</p>
            <p><strong>Giá:</strong> {selectedPurchase.price.naturalAmount} USDC</p>
            <p>
              <strong>Ngày mua:</strong>{" "}
              {new Date(selectedPurchase.sku.item.created).toLocaleDateString()}
            </p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              <span
                className={`badge ${
                  selectedPurchase.status === "Confirmed"
                    ? "bg-success"
                    : selectedPurchase.status === "Pending"
                    ? "bg-warning"
                    : selectedPurchase.status === "Expired"
                    ? "bg-danger"
                    : "bg-secondary"
                }`}
              >
                {selectedPurchase.status}
              </span>
            </p>
            {selectedPurchase.status === "Pending" && (
              <p>
                <strong>Tiếp tục thanh toán:</strong>{" "}
                <a
                  href={`https://app.gameshift.dev/checkout?payment=${selectedPurchase.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-warning btn-sm"
                >
                  Thanh toán
                </a>
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Đóng
            </Button>
          </Modal.Footer>
        </Modal>
      )}
      {imageToShow && (
        <Modal show={true} onHide={() => setImageToShow(null)} centered>
          <Modal.Body>
            <div className="image-zoom-container">
              <img
                src={imageToShow}
                alt="Phóng to"
                className="zoomed-image"
                onClick={() => setImageToShow(null)}
              />
            </div>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
};

export default PurchaseHistory;

