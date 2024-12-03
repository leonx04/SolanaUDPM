import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Row, Spinner, Tab, Tabs } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { apiKey } from '../api';

const COLLECTION_IDS = {
  art: '35fe7ca2-e2ce-4df5-b24c-5040c6f0d186',
  images: 'fba8b4c9-5a04-466c-b609-6532cbd6d9d1',
};

const AccountCollections = ({ referenceId }) => {
  const [activeCollection, setActiveCollection] = useState(COLLECTION_IDS.art);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async (collectionId) => {
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
      setItems(filteredItems);
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [referenceId]);

  useEffect(() => {
    fetchItems(activeCollection);
  }, [activeCollection, fetchItems]);

  const handleCollectionChange = (collectionId) => {
    setActiveCollection(collectionId);
  };

  const renderItems = () => {
    if (items.length === 0) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-inbox-fill text-muted" style={{ fontSize: '4rem' }}></i>
          <h2 className="text-muted mt-3">Không có sản phẩm nào</h2>
          <p className="text-muted">Hiện tại chưa có sản phẩm nào trong bộ sưu tập này.</p>
        </div>
      );
    }

    return (
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
        {items.map((itemData) => {
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
                    <span className="badge bg-primary rounded-pill px-3 py-2">
                      {item.price ? `$${parseFloat(item.price.naturalAmount).toFixed(2)} ${item.price.currencyId}` : 'Không có giá'}
                    </span>
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

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Đang tải dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        renderItems()
      )}
    </div>
  );
};

export default AccountCollections;