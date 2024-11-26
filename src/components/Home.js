import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiKey } from '../api';
import { Card, Button, Modal, Spinner, Alert } from 'react-bootstrap';

const MarketplaceHome = ({ referenceId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get('https://api.gameshift.dev/nx/items', {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey
        }
      });

      // Lọc và loại bỏ SOL, USDC, sản phẩm chưa có giá và sản phẩm của chính người dùng
      const filteredItems = response.data.data.filter(
        itemData => 
          itemData.type === 'UniqueAsset' && 
          itemData.item.priceCents !== null &&
          itemData.item.ownerId !== referenceId
      );

      setItems(filteredItems);
      setLoading(false);
    } catch (err) {
      setError('Không thể tải danh sách sản phẩm');
      setLoading(false);
    }
  };

  const handleBuyItem = (item) => {
    setSelectedItem(item);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setBuyError(null);
  };

  const buyItemWithPhantomWallet = async () => {
    setBuyLoading(true);
    setBuyError(null);

    try {
      // Kiểm tra kết nối ví Phantom
      const provider = window.phantom?.solana;
      if (!provider || !provider.isConnected) {
        throw new Error("Vui lòng kết nối ví Phantom trước khi mua");
      }

      // Gọi API để tạo giao dịch mua
      const response = await axios.post(
        `https://api.gameshift.dev/nx/unique-assets/${selectedItem.id}/buy`, 
        {
          // Sử dụng referenceId làm buyerId
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

      // Mở URL consent để hoàn tất thanh toán
      window.open(consentUrl, '_blank');

      // Đóng modal sau khi mở consent URL
      closeModal();

      // Làm mới danh sách sản phẩm sau khi mua
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
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center" role="alert">
        {error}
      </div>
    );
  }

  // Kiểm tra nếu không có sản phẩm nào
  if (items.length === 0) {
    return (
      <div className="container text-center py-5">
        <h2 className="text-muted">Hiện tại chưa có sản phẩm nào để mua</h2>
        <p className="lead">Vui lòng quay lại sau</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-5 bg-light">
      <div className="container">
        <h1 className="text-center mb-5 display-4 fw-bold text-primary">
          Marketplace Unique Assets
        </h1>
        
        <div className="row row-cols-1 row-cols-md-3 g-4">
          {items.map((itemData) => {
            const item = itemData.item;
            return (
              <div key={item.id} className="col">
                <Card className="h-100 shadow-sm hover-lift">
                  <Card.Img 
                    variant="top" 
                    src={item.imageUrl} 
                    className="card-img-top"
                    style={{
                      height: '250px', 
                      objectFit: 'cover'
                    }}
                  />
                  <Card.Body>
                    <Card.Title className="fw-bold">{item.name}</Card.Title>
                    <Card.Text className="text-muted mb-2">
                      {item.description || 'Không có mô tả'}
                    </Card.Text>
                    
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="badge bg-primary">
                          {`$${(item.priceCents / 100).toFixed(2)} USDC`}
                        </span>
                        <span className={`ms-2 badge ${item.escrow ? 'bg-success' : 'bg-warning'}`}>
                          {item.escrow ? 'Đang trong Escrow' : 'Sẵn sàng'}
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