import axios from 'axios';
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Alert, Button, Card, Carousel, Col, Container, Modal, OverlayTrigger, Row, Spinner, Tooltip } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { apiKey } from '../api';
import FeaturedUsers from './FeaturedUsers';

// Action types for reducer
const ACTIONS = {
  FETCH_START: 'FETCH_START',
  FETCH_SUCCESS: 'FETCH_SUCCESS',
  FETCH_ERROR: 'FETCH_ERROR',
  SET_SELECTED_ITEM: 'SET_SELECTED_ITEM',
  CLEAR_SELECTED_ITEM: 'CLEAR_SELECTED_ITEM',
  SET_BUY_LOADING: 'SET_BUY_LOADING',
  SET_BUY_ERROR: 'SET_BUY_ERROR',
  SET_BUY_SUCCESS: 'SET_BUY_SUCCESS',
  SET_FEATURED_ITEMS: 'SET_FEATURED_ITEMS',
};

// Reducer function
const reducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.FETCH_START:
      return { ...state, loading: true, error: null };
    case ACTIONS.FETCH_SUCCESS:
      return { ...state, loading: false, allItems: action.payload, lastFetchTime: Date.now() };
    case ACTIONS.FETCH_ERROR:
      return { ...state, loading: false, error: action.payload };
    case ACTIONS.SET_SELECTED_ITEM:
      return { ...state, selectedItem: action.payload };
    case ACTIONS.CLEAR_SELECTED_ITEM:
      return { ...state, selectedItem: null };
    case ACTIONS.SET_BUY_LOADING:
      return { ...state, buyLoading: action.payload };
    case ACTIONS.SET_BUY_ERROR:
      return { ...state, buyError: action.payload };
    case ACTIONS.SET_BUY_SUCCESS:
      return { ...state, buySuccess: action.payload };
    case ACTIONS.SET_FEATURED_ITEMS:
      return { ...state, featuredItems: action.payload };
    default:
      return state;
  }
};

const COLLECTION_IDS = {
  art: '7709064c-7f03-4891-801f-a2de787a688f',
  images: 'fdd7a4c0-2312-45db-bcc2-ccdea75cc20a',
};

const MarketplaceHome = ({ referenceId }) => {
  const [state, dispatch] = useReducer(reducer, {
    allItems: [],
    featuredItems: [],
    loading: true,
    error: null,
    selectedItem: null,
    buyLoading: false,
    buyError: null,
    buySuccess: null,
    lastFetchTime: Date.now(),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const productSectionRef = useRef(null);

  const fetchAllItems = useCallback(async (signal) => {
    if (isModalOpen || isRedirecting) return;

    dispatch({ type: ACTIONS.FETCH_START });

    try {
      const fetchPage = async (page, collectionId) => {
        const response = await axios.get('https://api.gameshift.dev/nx/items', {
          signal,
          params: {
            perPage: 100,
            page: page,
            collectionId: collectionId,
          },
          headers: {
            accept: 'application/json',
            'x-api-key': apiKey,
          },
        });
        return response.data;
      };

      let allFetchedItems = [];
      for (const collectionId of Object.values(COLLECTION_IDS)) {
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
          const { data, meta } = await fetchPage(page, collectionId);
          allFetchedItems.push(...data);
          totalPages = meta.totalPages;
          page++;
        }
      }

      dispatch({ type: ACTIONS.FETCH_SUCCESS, payload: allFetchedItems });

      // Set featured items
      const featuredItems = allFetchedItems
        .filter(itemData =>
          itemData.type === 'UniqueAsset' &&
          itemData.item.price &&
          itemData.item.price.naturalAmount !== null &&
          parseFloat(itemData.item.price.naturalAmount) > 0 &&
          itemData.item.owner.referenceId !== referenceId // Filter out items owned by the current user
        )
        .sort((a, b) => {
          const priceA = parseFloat(a.item.price.naturalAmount);
          const priceB = parseFloat(b.item.price.naturalAmount);
          const dateA = new Date(a.item.createdAt);
          const dateB = new Date(b.item.createdAt);

          if (priceA !== priceB) {
            return priceA - priceB; // Sort by price (lowest first)
          }
          return dateB - dateA; // If prices are equal, sort by date (newest first)
        })
        .slice(0, 6); // Limit to 6 items

      dispatch({ type: ACTIONS.SET_FEATURED_ITEMS, payload: featuredItems });

    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request canceled', err.message);
      } else {
        dispatch({ type: ACTIONS.FETCH_ERROR, payload: 'Không thể tải danh sách sản phẩm: ' + err.message });
        console.error('Fetch error:', err);
      }
    }
  }, [referenceId, isModalOpen, isRedirecting]);

  const handlePeriodicRefresh = useCallback(async () => {
    const controller = new AbortController();
    await fetchAllItems(controller.signal);
    return () => controller.abort();
  }, [fetchAllItems]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      handlePeriodicRefresh();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [handlePeriodicRefresh]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAllItems(controller.signal);
    return () => controller.abort();
  }, [fetchAllItems]);

  const handleBuyItem = (itemData) => {
    if (itemData.item.owner.referenceId === referenceId) {
      dispatch({ type: ACTIONS.SET_BUY_ERROR, payload: "Bạn không thể mua sản phẩm của chính mình." });
    } else {
      dispatch({ type: ACTIONS.SET_SELECTED_ITEM, payload: itemData.item });
      dispatch({ type: ACTIONS.SET_BUY_ERROR, payload: null });
      setIsModalOpen(true);
    }
  };

  const buyItemWithPhantomWallet = async () => {
    dispatch({ type: ACTIONS.SET_BUY_LOADING, payload: true });
    dispatch({ type: ACTIONS.SET_BUY_ERROR, payload: null });
    dispatch({ type: ACTIONS.SET_BUY_SUCCESS, payload: null });

    try {
      const provider = window.phantom?.solana;
      if (!provider || !provider.isConnected) {
        throw new Error("Vui lòng kết nối ví Phantom trước khi mua");
      }

      if (state.selectedItem.owner.referenceId === referenceId) {
        throw new Error("Bạn không thể mua sản phẩm của chính mình.");
      }

      const response = await axios.post(
        `https://api.gameshift.dev/nx/unique-assets/${state.selectedItem.id}/buy`,
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
      setIsRedirecting(true);
      window.open(consentUrl, '_blank');
      
      setIsRedirecting(false);
      fetchAllItems();

    } catch (err) {
      console.error('Lỗi mua sản phẩm:', err);

      const errorMessage = err.response?.data?.message ||
        err.message ||
        'Không thể thực hiện giao dịch. Vui lòng thử lại.';

      dispatch({ type: ACTIONS.SET_BUY_ERROR, payload: errorMessage });
      setIsRedirecting(false);
    } finally {
      dispatch({ type: ACTIONS.SET_BUY_LOADING, payload: false });
    }
  };

  const scrollToProducts = () => {
    productSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderProductGrid = (items) => {
    if (state.loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Đang tải dữ liệu...</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-inbox-fill text-muted" style={{ fontSize: '4rem' }}></i>
          <h2 className="text-muted mt-3">Không có sản phẩm nào</h2>
          <p className="text-muted">Hiện tại chưa có sản phẩm nào để hiển thị.</p>
          <Button
            variant="outline-primary"
            onClick={() => fetchAllItems()}
            className="mt-3"
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Tải lại
          </Button>
        </div>
      );
    }

    return (
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4 mb-4">
        {items.map((itemData) => {
          const item = itemData.item;
          const isOwnItem = item.owner.referenceId === referenceId;
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
                    Tác giả:
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id={`tooltip-${item.owner.referenceId}`}>
                          Nhấn để xem trang cá nhân của tác giả
                        </Tooltip>
                      }
                    >
                      <Link
                        className="text-decoration-none badge badge-success"
                        to={`/account/${item.owner.referenceId}`}
                      >
                        <i className="bi bi-person-circle me-1"></i> {item.owner.referenceId}
                      </Link>
                    </OverlayTrigger>
                  </Card.Text>
                  <div className="mt-auto d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary rounded-pill px-3 py-2">
                      {`$${parseFloat(item.price.naturalAmount).toFixed(2)} ${item.price.currencyId}`}
                    </span>
                    <Button
                      variant={isOwnItem ? "outline-secondary" : "outline-primary"}
                      size="sm"
                      onClick={() => handleBuyItem(itemData)}
                      className="rounded-pill"
                      disabled={isOwnItem}
                    >
                      {isOwnItem ? 'Sản phẩm của bạn' : 'Mua ngay'}
                    </Button>
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
    <div className="marketplace-home">
      <Card className="container text-center border-0 shadow-sm">
        <header className="hero-section text-center py-5">
          <h1 className="display-4 fw-bold text-primary mb-3">Khám phá NFT độc đáo</h1>
          <p className="lead mb-4">Sở hữu những tác phẩm nghệ thuật số độc nhất và tiên phong trong thế giới blockchain.</p>
          <Button variant="primary" size="lg" className="rounded-pill px-4 py-2" onClick={scrollToProducts}>Khám phá ngay</Button>
        </header>
      </Card>


      <div className="carousel container mb-5 ">
        <Carousel className="rounded-lg overflow-hidden shadow-lg">
          <Carousel.Item>
            <img
              className="d-block w-100"
              src="https://static.vecteezy.com/system/resources/previews/017/797/790/non_2x/banner-for-nft-industry-one-point-perspective-concept-with-terms-of-web3-vector.jpg"
              alt="Bộ sưu tập NFT"
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
              alt="Trải nghiệm mua bán NFT"
            />
            <Carousel.Caption>
              <h3>Trải nghiệm mua bán NFT</h3>
              <p>Bước vào thế giới ảo với NFT của bạn.</p>
            </Carousel.Caption>
          </Carousel.Item>
        </Carousel>
      </div>

      <section className="how-it-works-section py-5">
        <Container>
          <h2 className="text-center fw-bold mb-5">Cách thức hoạt động</h2>
          <Row className="g-4">
            {[
              { title: "Kết nối ví", description: "Liên kết ví Phantom của bạn với tài khoản.", icon: "wallet2" },
              { title: "Khám phá NFT", description: "Tìm kiếm và chọn NFT yêu thích của bạn.", icon: "search" },
              { title: "Đặt giá mua", description: "Chọn NFT bạn yêu thích và tiến hành mua.", icon: "cash-coin" },
              { title: "Hoàn tất giao dịch", description: "Xác nhận và nhận NFT vào ví của bạn.", icon: "check-circle" }
            ].map((step, index) => (
              <Col key={index} md={3}>
                <Card className="h-100 text-center border-0 shadow-sm">
                  <Card.Body>
                    <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                      <i className={`bi bi-${step.icon} fs-4`}></i>
                    </div>
                    <h5 className="card-title fw-bold">{step.title}</h5>
                    <p className="card-text">{step.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      <div className="container mb-5">
        <FeaturedUsers />
      </div>

      <section className="benefits-section py-5">
        <div className="container">
          <h2 className="text-center fw-bold mb-5">Lợi ích của NFT Marketplace</h2>
          <div className="row g-4">
            {[
              { title: "Sở hữu độc quyền", description: "Xác nhận quyền sở hữu duy nhất của tác phẩm nghệ thuật số." },
              { title: "Giao dịch an toàn", description: "Sử dụng công nghệ blockchain để đảm bảo tính minh bạch và bảo mật." },
              { title: "Hỗ trợ nghệ sĩ", description: "Tạo cơ hội cho nghệ sĩ kiếm thu nhập trực tiếp từ tác phẩm của họ." },
              { title: "Đầu tư tiềm năng", description: "Cơ hội đầu tư vào tài sản số có giá trị tăng trưởng." }
            ].map((benefit, index) => (
              <div key={index} className="col-md-3">
                <Card className="h-100 text-center border-0 shadow-sm">
                  <Card.Body>
                    <i className={`bi bi-${['shield-check', 'lock', 'palette', 'graph-up-arrow'][index]} display-4 mb-3 text-primary`}></i>
                    <h5 className="card-title fw-bold">{benefit.title}</h5>
                    <p className="card-text">{benefit.description}</p>
                  </Card.Body>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mb-5" ref={productSectionRef}>
        <h2 className="text-center fw-bold mb-4">Sản phẩm nổi bật</h2>
        {renderProductGrid(state.featuredItems)}
        <div className="text-center mt-4">
          <Button as={Link} to="/all-items" variant="outline-primary">Xem tất cả sản phẩm</Button>
        </div>
      </div>

      <section className="roadmap-section py-5 bg-light">
        <div className="container">
          <h2 className="text-center fw-bold mb-5">Lộ trình phát triển</h2>
          <div className="row g-4">
            {[
              { title: "Giai đoạn 1", description: "Phát triển cơ sở hạ tầng và tích hợp Blockchain." },
              { title: "Giai đoạn 2", description: "Ra mắt bộ sưu tập NFT đầu tiên và tích hợp Game Shift." },
              { title: "Giai đoạn 3", description: "Mở rộng cộng đồng và triển khai tính năng mới." },
              { title: "Giai đoạn 4", description: "Tích hợp FireBase và tăng trải nghiệm người dùng." }
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

      {state.selectedItem && (
        <Modal 
          show={isModalOpen} 
          onHide={() => {
            setIsModalOpen(false);
            dispatch({ type: ACTIONS.CLEAR_SELECTED_ITEM });
          }} 
          size="lg" 
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Mua ngay <span className="badge bg-info">{state.selectedItem.name}</span></Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row">
              <div className="col-md-6">
                <img
                  src={state.selectedItem.imageUrl}
                  alt={state.selectedItem.name}
                  className="img-fluid rounded shadow-sm mb-3"
                />
              </div>
              <div className="col-md-6">
                <h5 className="mb-3">Chi tiết sản phẩm</h5>
                <Card className="mb-3">
                  <Card.Body>
                    <p><strong>Tên:</strong> {state.selectedItem.name}</p>
                    <p><strong>Mô tả:</strong> {state.selectedItem.description || 'Không có mô tả'}</p>
                    <p><strong>Giá:</strong> ${parseFloat(state.selectedItem.price.naturalAmount).toFixed(2)} {state.selectedItem.price.currencyId}</p>
                  </Card.Body>
                </Card>

                {state.selectedItem.attributes && state.selectedItem.attributes.length > 0 && (
                  <Card>
                    <Card.Header>Thuộc tính</Card.Header>
                    <Card.Body>
                      {state.selectedItem.attributes.map((attr, index) => (
                        <div key={index} className="d-flex justify-content-between mb-2">
                          <span className="text-muted">{attr.traitType}</span>
                          <span className="badge bg-secondary">{attr.value}</span>
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                )}

                {state.buyError && (
                  <Alert variant="danger" className="mt-3">
                    {state.buyError}
                  </Alert>
                )}

                {state.buySuccess && (
                  <Alert variant="success" className="mt-3">
                    {state.buySuccess}
                  </Alert>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => {
              setIsModalOpen(false);
              dispatch({ type: ACTIONS.CLEAR_SELECTED_ITEM });
            }}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={buyItemWithPhantomWallet}
              disabled={state.buyLoading || state.selectedItem.owner.referenceId === referenceId || isRedirecting}
            >
              {state.buyLoading || isRedirecting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  {isRedirecting ? 'Đang chuyển hướng...' : 'Đang xử lý...'}
                </>
              ) : state.selectedItem.owner.referenceId === referenceId ? (
                'Sản phẩm của bạn'
              ) : (
                'Mua ngay'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
};

export default MarketplaceHome;

