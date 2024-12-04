import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { apiKey } from '../api';

const FeaturedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Lấy dữ liệu người dùng từ Firebase
        const firebaseResponse = await axios.get('https://solana-b7b9d-default-rtdb.firebaseio.com/account.json');
        const firebaseUsers = firebaseResponse.data;

        // Lấy dữ liệu vật phẩm từ API Game Shift
        const gameShiftResponse = await axios.get('https://api.gameshift.dev/nx/items', {
          headers: {
            'accept': 'application/json',
            'x-api-key': apiKey
          }
        });
        const gameShiftItems = gameShiftResponse.data.data;

        // Xử lý và kết hợp dữ liệu
        const processedUsers = Object.entries(firebaseUsers || {}).map(([referenceId, userData]) => {
          const userItems = gameShiftItems.filter(item => 
            item.item && 
            item.item.owner && 
            item.item.owner.referenceId === referenceId &&
            item.item.price && 
            item.item.price.naturalAmount !== null &&
            parseFloat(item.item.price.naturalAmount) > 0
          );
          return {
            referenceId,
            username: userData.username || referenceId, // Sử dụng referenceId nếu không có username
            imageUrl: userData.imageUrl || 'https://via.placeholder.com/150',
            coverImageUrl: userData.coverImageUrl || 'https://via.placeholder.com/300x100',
            itemCount: userItems.length
          };
        });

        // Sắp xếp người dùng theo số lượng vật phẩm và lấy top 5
        const sortedUsers = processedUsers
          .sort((a, b) => b.itemCount - a.itemCount)
          .slice(0, 5);
        setUsers(sortedUsers);
      } catch (error) {
        console.error('Lỗi khi tải danh sách người dùng nổi bật:', error);
        setError('Không thể tải danh sách người dùng nổi bật. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
        <p className="mt-2">Đang tải danh sách người dùng nổi bật...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="my-5">
        <Alert.Heading>Ôi không! Có lỗi xảy ra!</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (users.length === 0) {
    return (
      <Alert variant="info" className="my-5">
        <Alert.Heading>Không có người dùng nổi bật</Alert.Heading>
        <p>Hiện tại không tìm thấy người dùng nổi bật. Vui lòng quay lại sau!</p>
      </Alert>
    );
  }

  return (
    <div className="featured-users mb-5">
      <h2 className="text-center mb-4">Người dùng nổi bật</h2>
      <Row xs={1} md={2} lg={5} className="g-4">
        {users.map((user) => (
          <Col key={user.referenceId}>
            <Card className="h-100">
              <Card.Img variant="top" src={user.coverImageUrl} style={{ height: '100px', objectFit: 'cover' }} />
              <Card.Body className="text-center">
                <img
                  src={user.imageUrl}
                  alt={user.username}
                  className="rounded-circle mb-3"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', marginTop: '-60px', border: '4px solid white' }}
                />
                <Card.Title>{user.username}</Card.Title>
                <Card.Text>Đang bán: {user.itemCount}</Card.Text>
                <Link to={`/account/${user.referenceId}`} className="btn btn-primary btn-sm">Xem hồ sơ</Link>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default FeaturedUsers;
