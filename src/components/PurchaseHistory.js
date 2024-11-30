import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { apiKey } from '../api';
import '../App.css';

const PurchaseHistory = ({ referenceId }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [imageToShow, setImageToShow] = useState(null);

  // Hàm lấy lịch sử mua hàng
  const fetchPurchaseHistory = async () => {
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
        setPurchases(userPurchases);
      } else {
        throw new Error("Dữ liệu trả về không đúng định dạng.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPurchase(null);
  };

  const handleImageClick = (imageUrl) => {
    setImageToShow(imageUrl); // Cập nhật ảnh cần phóng to
  };

  // Kiểm tra trạng thái giao dịch
  const checkTransactionStatus = async (paymentId) => {
    try {
      const response = await fetch(
        `https://api.gameshift.dev/nx/payments/${paymentId}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-api-key": apiKey, // Thay bằng API key của bạn
          },
        }
      );

      if (!response.ok) {
        throw new Error("Không thể kiểm tra trạng thái giao dịch.");
      }

      const data = await response.json();

      // Kiểm tra nếu giao dịch đã hết hạn
      if (data.status === "Expired") {
        // Cập nhật trạng thái giao dịch thành 'Expired'
        updatePurchaseStatus(paymentId, "Expired");
      }

      return data.status; // Trả về trạng thái giao dịch
    } catch (error) {
      console.error("Lỗi kiểm tra trạng thái giao dịch:", error);
      return null;
    }
  };

  // Cập nhật trạng thái giao dịch
  const updatePurchaseStatus = (paymentId, status) => {
    setPurchases((prevPurchases) =>
      prevPurchases.map((purchase) =>
        purchase.id === paymentId ? { ...purchase, status } : purchase
      )
    );
  };

  useEffect(() => {
    if (referenceId) {
      fetchPurchaseHistory(); // Lấy dữ liệu ban đầu
    }
  }, [referenceId]);

  if (loading) {
    return <div>Đang tải dữ liệu...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5>Lịch Sử Mua Hàng</h5>
      </div>
      <div className="card-body">
        <table className="table">
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
            {purchases.map((purchase, index) => (
              <tr key={purchase.id}>
                <td>{index + 1}</td>
                <td>
                  <img
                    src={purchase.sku.item.imageUrl}
                    alt={purchase.sku.item.name}
                    style={{
                      width: "50px",
                      height: "50px",
                      objectFit: "cover",
                      cursor: "pointer",
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
                    className={`badge ${
                      purchase.status === "Confirmed"
                        ? "bg-success"
                        : purchase.status === "Pending"
                        ? "bg-warning"
                        : "bg-secondary"
                    }`}
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
      </div>

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
                className={`badge ${
                  selectedPurchase.status === "Confirmed"
                    ? "bg-success"
                    : selectedPurchase.status === "Pending"
                    ? "bg-warning"
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
