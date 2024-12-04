import axios from 'axios';
import { get, getDatabase, ref, update } from "firebase/database";
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Nav, Row, Tab } from 'react-bootstrap';
import { Edit3, Facebook, GitHub, Globe, Youtube } from 'react-feather';
import { useParams } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';
import AccountCollections from './AccountCollections';
import ItemsForSale from './ItemsForSale';
import ItemsGrid from './ItemsGrid';
import CreateItemModal from './CreateItemModal';

const SOCIAL_PLATFORMS = {
  facebook: { icon: Facebook, color: '#1877F2', prefix: '' },
  github: { icon: GitHub, color: '#181717', prefix: '' },
  youtube: { icon: Youtube, color: '#FF0000', prefix: '' },
  website: { icon: Globe, color: '#4CAF50', prefix: '' }
};

const AccountManagement = () => {
  const { referenceId } = useParams();
  const [loggedInUser] = useContext(UserContext);
  const [profileData, setProfileData] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    avatar: null,
    coverImage: null,
    socialLinks: {}
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateItemModal, setShowCreateItemModal] = useState(false);

  const isOwnProfile = loggedInUser?.referenceId === referenceId;

  useEffect(() => {
    const fetchProfileData = async () => {
      const db = getDatabase();
      const userRef = ref(db, `account/${referenceId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfileData(data);
        setEditForm({
          username: data.username || '',
          bio: data.bio || '',
          avatar: null,
          coverImage: null,
          socialLinks: data.socialLinks || {}
        });
      } else {
        setError('Không tìm thấy hồ sơ');
      }
    };

    fetchProfileData();
  }, [referenceId]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Kích thước file không được vượt quá 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') {
          setAvatarPreview(reader.result);
          setEditForm(prev => ({ ...prev, avatar: file }));
        } else {
          setCoverPreview(reader.result);
          setEditForm(prev => ({ ...prev, coverImage: file }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (file, folder) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ARTSOLANA');
    formData.append('folder', folder);

    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/dy3nmkszo/image/upload`,
        formData
      );
      return response.data.secure_url;
    } catch (error) {
      throw new Error('Không thể tải lên hình ảnh');
    }
  };

  const handleSocialLinkChange = (platform, value) => {
    setEditForm(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = profileData?.imageUrl;
      let coverUrl = profileData?.coverImageUrl;

      if (editForm.avatar) {
        avatarUrl = await uploadToCloudinary(editForm.avatar, 'avatar');
      }
      if (editForm.coverImage) {
        coverUrl = await uploadToCloudinary(editForm.coverImage, 'covers');
      }

      const db = getDatabase();
      const userRef = ref(db, `account/${referenceId}`);
      const updateData = {
        username: editForm.username,
        bio: editForm.bio,
        imageUrl: avatarUrl,
        coverImageUrl: coverUrl,
        socialLinks: editForm.socialLinks
      };

      await update(userRef, updateData);
      setProfileData(prev => ({ ...prev, ...updateData }));
      setSuccess('Cập nhật hồ sơ thành công!');
      setShowEditModal(false);
    } catch (err) {
      setError('Không thể cập nhật hồ sơ. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!profileData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div
        className="cover-image position-relative rounded-3"
        style={{
          height: '300px',
          backgroundImage: `url(${profileData?.coverImageUrl || 'https://via.placeholder.com/1200x300'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {isOwnProfile && (
          <Button variant="light" className="position-absolute bottom-0 end-0 m-3" onClick={() => setShowEditModal(true)}>
            <Edit3 size={16} className="me-2" />
            Chỉnh sửa hồ sơ
          </Button>
        )}
      </div>

      <div className="profile-info px-4 py-4">
        <Row>
          <Col md={3}>
            <div className="position-relative" style={{ marginTop: '-75px' }}>
              <img
                src={profileData?.imageUrl || 'https://via.placeholder.com/150'}
                alt="Ảnh đại diện"
                className="rounded-circle border border-4 border-white"
                style={{ width: "200px", height: "200px", objectFit: "cover" }}
              />
            </div>
          </Col>
          <Col md={9}>
            <div className="mt-3">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="mb-1">{profileData?.username || 'Chưa đặt tên'}</h2>
                    <p className="text-muted mb-2">
                      <small>{profileData?.email}</small>
                    </p>
                  </div>
                  <div className="d-flex gap-2">
                    {Object.entries(profileData?.socialLinks || {}).map(([platform, username]) => {
                      if (!username) return null;
                      const { icon: Icon, color, prefix } = SOCIAL_PLATFORMS[platform];
                      return (
                        <a
                          key={platform}
                          href={prefix + username}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none"
                          style={{ color }}
                        >
                          <Icon size={20} />
                        </a>
                      );
                    })}
                  </div>
                </div>
                <p className="mb-3">{profileData?.bio || 'Chưa có tiểu sử'}</p>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <Tab.Container defaultActiveKey="created">
        <Nav variant="tabs" className="px-4 mt-4">
          <Nav.Item>
            <Nav.Link eventKey="created">Đã tạo</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="collected">Bộ sưu tập</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="activity">Hoạt động</Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content className="px-4 py-4">
          <Tab.Pane eventKey="created">
            {isOwnProfile && (
              <Button
                variant="primary"
                className="mb-3"
                onClick={() => setShowCreateItemModal(true)}
              >
                Tạo vật phẩm mới
              </Button>
            )}
            <ItemsGrid
              referenceId={referenceId}
              isOwnProfile={isOwnProfile}
              loggedInUserId={loggedInUser?.referenceId}
            />
          </Tab.Pane>
          <Tab.Pane eventKey="collected">
            <AccountCollections
              referenceId={referenceId}
              isOwnProfile={isOwnProfile}
              loggedInUserId={loggedInUser?.referenceId}
            />
          </Tab.Pane>
          <Tab.Pane eventKey="activity">
            {referenceId && <ItemsForSale referenceId={referenceId}
              isOwnProfile={isOwnProfile}
              loggedInUserId={loggedInUser?.referenceId} />}
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Chỉnh sửa hồ sơ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="d-block mb-2">Ảnh bìa</label>
              <div
                className="cover-preview position-relative mb-2"
                style={{
                  height: '200px',
                  backgroundImage: `url(${coverPreview || profileData.coverImageUrl || 'https://via.placeholder.com/1200x300'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '8px'
                }}
              >
                <div className="position-absolute bottom-0 end-0 m-2">
                  <label className="btn btn-light btn-sm">
                    <input
                      type="file"
                      className="d-none"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'cover')}
                    />
                    Thay đổi ảnh bìa
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="d-block mb-2">Ảnh đại diện</label>
              <div className="d-flex align-items-center gap-3">
                <img
                  src={avatarPreview || profileData.imageUrl || 'https://via.placeholder.com/150'}
                  alt="Xem trước ảnh đại diện"
                  className="rounded-circle"
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                />
                <label className="btn btn-light">
                  <input
                    type="file"
                    className="d-none"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'avatar')}
                  />
                  Thay đổi ảnh đại diện
                </label>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Tên người dùng</Form.Label>
              <Form.Control
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Nhập tên người dùng"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tiểu sử</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Giới thiệu về bản thân"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Liên kết mạng xã hội</Form.Label>
              {Object.entries(SOCIAL_PLATFORMS).map(([platform, { icon: Icon, prefix }]) => (
                <Form.Group className="mb-2" key={platform}>
                  <Form.Label>
                    <Icon size={16} className="me-2" />
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder={`Nhập link tài khoản ${platform} của bạn`}
                    value={editForm.socialLinks[platform] || ''}
                    onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                  />
                </Form.Group>
              ))}
            </Form.Group>
          </Form>

          {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
          {success && <Alert variant="success" className="mt-3">{success}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </Modal.Footer>
      </Modal>
      <CreateItemModal
        show={showCreateItemModal}
        onHide={() => setShowCreateItemModal(false)}
        referenceId={referenceId}
        onSuccess={() => {
          setShowCreateItemModal(false);
          // Optionally, you can refresh the items grid here
        }}
      />
    </div>
  );
};

export default AccountManagement;
