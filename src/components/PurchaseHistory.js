import React, { useEffect, useState, useCallback } from "react";
import { Modal, Button, Form, InputGroup, Pagination } from "react-bootstrap";
import { apiKey } from '../api';
import '../App.css';

const PurchaseHistory = ({ referenceId }) => {
  const [purchases, setPurchases] = useState([]);
  const [filteredPurchases, setFilteredPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [imageToShow, setImageToShow] = useState(null);

  // Trạng thái cho bộ lọc và tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');

  // Trạng thái phân trang nâng cao
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Hàm lấy lịch sử mua hàng với khả năng kiểm tra trạng thái
  const fetchPurchaseHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = "https://api.gameshift.dev/nx/payments";
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          "x-api-key": apiKey,
        },
      };

      const response = await fetch(url, options);
      const data = await response.json();

      if (Array.isArray(data.data)) {
        const userPurchases = data.data.filter(
          (purchase) => purchase.purchaser.referenceId === referenceId
        );

        // Kiểm tra trạng thái giao dịch cho từng đơn hàng
        const updatedPurchases = await Promise.all(
          userPurchases.map(async (purchase) => {
            const status = await checkTransactionStatus(purchase.id);
            return {
              ...purchase,
              status: status || purchase.status
            };
          })
        );

        setPurchases(updatedPurchases);
        setFilteredPurchases(updatedPurchases);
        setCurrentPage(1);
      } else {
        throw new Error("Dữ liệu trả về không đúng định dạng.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [referenceId]);

  // Hàm kiểm tra trạng thái giao dịch
  const checkTransactionStatus = async (paymentId) => {
    try {
      const response = await fetch(
        `https://api.gameshift.dev/nx/payments/${paymentId}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-api-key": apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Không thể kiểm tra trạng thái giao dịch.");
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error("Lỗi kiểm tra trạng thái giao dịch:", error);
      return null;
    }
  };

  // Hàm lọc và tìm kiếm
  const applyFiltersAndSearch = useCallback(() => {
    let result = purchases;

    // Lọc theo trạng thái
    if (statusFilter !== 'Tất cả') {
      result = result.filter(purchase => purchase.status === statusFilter);
    }

    // Tìm kiếm
    if (searchTerm) {
      result = result.filter(purchase =>
        purchase.sku.item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.sku.item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPurchases(result);
    setCurrentPage(1);
  }, [purchases, statusFilter, searchTerm]);

  // Hàm xem chi tiết đơn hàng
  const handleViewDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setShowModal(true);
  };

  // Hàm đóng modal chi tiết
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPurchase(null);
  };

  // Hàm xem ảnh phóng to
  const handleImageClick = (imageUrl) => {
    setImageToShow(imageUrl);
  };

  // Tính toán phân trang
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPurchases.slice(indexOfFirstItem, indexOfLastItem);

  // Thay đổi trang
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Tính toán tổng số trang
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  // Hàm tạo nút phân trang
  const renderPaginationItems = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Điều chỉnh lại startPage nếu endPage đã ở cuối
    if (endPage === totalPages) {
      startPage = Math.max(1, totalPages - maxPagesToShow + 1);
    }

    // Nút trang đầu
    if (startPage > 1) {
      pageNumbers.push(
        <Pagination.First key="first" onClick={() => paginate(1)} />,
        <Pagination.Ellipsis key="ellipsis-start" />
      );
    }

    // Các nút trang
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

    // Nút trang cuối
    if (endPage < totalPages) {
      pageNumbers.push(
        <Pagination.Ellipsis key="ellipsis-end" />,
        <Pagination.Last key="last" onClick={() => paginate(totalPages)} />
      );
    }

    return pageNumbers;
  };

  // Hiệu ứng phụ để áp dụng bộ lọc và tìm kiếm
  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  // Hiệu ứng phụ để tải dữ liệu
  useEffect(() => {
    if (referenceId) {
      fetchPurchaseHistory();
    }
  }, [referenceId, fetchPurchaseHistory]);

  // Xử lý trạng thái tải
  if (loading) {
    return <div>Đang tải dữ liệu...</div>;
  }

  // Xử lý lỗi
  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="card" style={{ width: '100%', maxWidth: '100%', overflowX: 'auto' }}>
      <div
        className="card-header"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '10px',
          padding: '15px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h5 style={{ margin: 0 }}>Lịch Sử Mua Hàng</h5>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              flex: 1,
              minWidth: '250px'
            }}
          >
            <InputGroup style={{ flex: 1, minWidth: '200px' }}>
              <Form.Control
                type="text"
                placeholder="Tìm kiếm sản phẩm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ height: '38px' }}
              />
            </InputGroup>

            <Form.Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '150px',
                height: '38px',
                minWidth: '120px'
              }}
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
              style={{
                width: '100px',
                height: '38px',
                minWidth: '80px'
              }}
            >
              <option value={5}>5 items</option>
              <option value={10}>10 items</option>
              <option value={20}>20 items</option>
              <option value={50}>50 items</option>
            </Form.Select>
          </div>
        </div>
      </div>

      <div
        className="card-body"
        style={{
          padding: '15px',
          overflowX: 'auto',
          width: '100%'
        }}
      >
        <table
          className="table table-responsive table-hover"
          style={{ minWidth: '800px', width: '100%' }}
        >
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '10%' }}>Ảnh</th>
              <th style={{ width: '15%' }}>Sản phẩm</th>
              <th style={{ width: '20%' }}>Mô tả</th>
              <th style={{ width: '10%' }}>Giá</th>
              <th style={{ width: '10%' }}>Ngày tạo</th>
              <th style={{ width: '10%' }}>Trạng thái</th>
              <th style={{ width: '10%' }}>Hành động</th>
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
                  {new Date(purchase.sku.item.created).toLocaleDateString()}
                </td>
                <td>
                  <span
                    className={`badge ${purchase.status === "Confirmed"
                      ? "bg-success"
                      : purchase.status === "Pending"
                        ? "bg-warning"
                        : purchase.status === "Expired"
                          ? "bg-danger"
                          : "bg-secondary"
                      }`}
                    style={{ fontSize: '0.8em' }}
                  >
                    {purchase.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleViewDetails(purchase)}
                  >
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPurchases.length === 0 && (
          <div
            className="text-center text-muted"
            style={{ padding: '20px' }}
          >
            Không có giao dịch nào phù hợp
          </div>
        )}

        {filteredPurchases.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '15px'
            }}
          >
            <div className="text-muted" style={{ minWidth: '200px' }}>
              Hiển thị {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredPurchases.length)}
              {' '}trong tổng số{' '}
              {filteredPurchases.length} giao dịch
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Pagination style={{ margin: 0 }}>
                {renderPaginationItems()}
              </Pagination>
            </div>
          </div>
        )}
      </div>

      {/* Modal chi tiết đơn hàng */}
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
                  width: "100px",
                  height: "100px",
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
                className={`badge ${selectedPurchase.status === "Confirmed"
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

      {/* Modal phóng to ảnh */}
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