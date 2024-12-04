# Đặc tả Yêu cầu Phần mềm (SRS)
## Sàn giao dịch NFT trên Solana

### 1. Giới thiệu

#### 1.1 Mục đích
Tài liệu này mô tả các yêu cầu phần mềm cho ứng dụng sàn giao dịch NFT dựa trên blockchain Solana. Ứng dụng cho phép người dùng tạo, mua, bán và quản lý NFT trên blockchain Solana.

#### 1.2 Phạm vi
Hệ thống sẽ cung cấp giao diện web cho phép người dùng tương tác với NFT, quản lý tài khoản và thực hiện giao dịch sử dụng ví Phantom. Nó tích hợp với blockchain Solana, API GameShift và Cơ sở dữ liệu Realtime của Firebase.

#### 1.3 Định nghĩa, Từ viết tắt và Chữ viết tắt
- NFT: Token Không thể thay thế
- SRS: Đặc tả Yêu cầu Phần mềm
- USDC: USD Coin (một stablecoin)
- API: Giao diện Lập trình Ứng dụng
- SOL: Đồng tiền mã hóa gốc của Solana

### 2. Mô tả Tổng quan

#### 2.1 Góc nhìn Sản phẩm
Sàn giao dịch NFT Solana là một ứng dụng web tích hợp với blockchain Solana, ví Phantom, API GameShift và Cơ sở dữ liệu Realtime của Firebase để cung cấp trải nghiệm liền mạch cho những người đam mê và sáng tạo NFT.

#### 2.2 Tính năng Sản phẩm
- Xác thực người dùng và quản lý tài khoản
- Tạo và đúc NFT
- Duyệt và tìm kiếm NFT
- Mua và bán NFT
- Tích hợp ví (Phantom)
- Lịch sử giao dịch
- Quản lý hồ sơ người dùng
- Cập nhật thời gian thực cho dữ liệu người dùng và trạng thái NFT

#### 2.3 Các loại Người dùng và Đặc điểm
- Người dùng Thông thường: Có thể duyệt, mua và bán NFT
- Người Sáng tạo: Có thể tạo và đúc NFT mới
- Quản trị viên: Có thể quản lý nền tảng và tài khoản người dùng

#### 2.4 Môi trường Hoạt động
- Trình duyệt web (Chrome, Firefox, Safari, Edge)
- Blockchain Solana (Devnet và Mainnet)
- Tiện ích mở rộng trình duyệt ví Phantom
- Cơ sở dữ liệu Realtime của Firebase
- API GameShift

#### 2.5 Ràng buộc Thiết kế và Triển khai
- Phải tương thích với blockchain Solana
- Phải tích hợp với ví Phantom
- Phải sử dụng API GameShift cho quản lý người dùng
- Phải sử dụng Cơ sở dữ liệu Realtime của Firebase để lưu trữ dữ liệu
- Phải tuân theo các phương pháp tốt nhất của React và kiến trúc dựa trên component

#### 2.5 Giả định và Phụ thuộc
- Người dùng đã cài đặt ví Phantom
- Kết nối internet ổn định cho các tương tác blockchain
- Blockchain Solana và các API liên quan hoạt động bình thường
- API GameShift khả dụng và phản hồi
- Các dịch vụ Firebase hoạt động bình thường

### 3. Tính năng Hệ thống và Yêu cầu

#### 3.1 Yêu cầu Chức năng

##### 3.1.1 Xác thực Người dùng
- Người dùng có thể đăng ký bằng email và mật khẩu
- Người dùng có thể đăng nhập vào tài khoản của họ
- Người dùng có thể đăng xuất khỏi tài khoản của họ
- Hệ thống sử dụng API GameShift để quản lý người dùng

##### 3.1.2 Tích hợp Ví
- Người dùng có thể kết nối ví Phantom của họ
- Hệ thống hiển thị số dư ví (SOL và USDC)
- Người dùng có thể ngắt kết nối ví của họ

##### 3.1.3 Quản lý NFT
- Người dùng có thể xem tất cả NFT có sẵn
- Người dùng có thể tạo và đúc NFT mới
- Người dùng có thể đăng bán NFT của họ
- Người dùng có thể đặt giá cho NFT của họ bằng USDC

##### 3.1.4 Chức năng Sàn giao dịch
- Người dùng có thể duyệt NFT theo bộ sưu tập
- Người dùng có thể tìm kiếm NFT theo tên hoặc mô tả
- Người dùng có thể lọc và sắp xếp NFT theo nhiều tiêu chí
- Người dùng có thể mua NFT bằng ví đã kết nối

##### 3.1.5 Hồ sơ Người dùng
- Người dùng có thể xem và chỉnh sửa thông tin hồ sơ của họ
- Người dùng có thể tải lên ảnh đại diện
- Người dùng có thể xem bộ sưu tập NFT của họ
- Dữ liệu hồ sơ được lưu trữ trong Cơ sở dữ liệu Realtime của Firebase

##### 3.1.5 Lịch sử Giao dịch
- Người dùng có thể xem lịch sử mua hàng của họ
- Hệ thống hiển thị trạng thái và chi tiết giao dịch

##### 3.1.7 Tích hợp API
- Hệ thống tích hợp với API GameShift để quản lý người dùng
- Các cuộc gọi API được xác thực bằng khóa API đã cung cấp

##### 3.1.8 Tích hợp Firebase
- Dữ liệu hồ sơ người dùng được lưu trữ và truy xuất từ Cơ sở dữ liệu Realtime của Firebase
- Hệ thống hỗ trợ cập nhật thời gian thực cho các thay đổi hồ sơ người dùng

#### 3.2 Yêu cầu Phi chức năng

##### 3.2.1 Hiệu suất
- Cập nhật số dư ví nên diễn ra ngay sau khi giao dịch
- Phản hồi API  được xử lý gần như lập tức.

##### 3.2.2 Bảo mật
- Xác thực người dùng an toàn
- Kết nối ví an toàn và tuân theo các phương pháp tốt nhất

##### 3.2.3 Khả năng Sử dụng
- Giao diện trực quan và dễ điều hướng
- Hệ thống cung cấp phản hồi rõ ràng cho tất cả các hành động của người dùng
- Ứng dụng đáp ứng và hoạt động trên cả máy tính để bàn và thiết bị di động


##### 3.2.5 Tương thích
- Ứng dụng hoạt động trên các trình duyệt web chính
- Ứng dụng đáp ứng và hoạt động trên cả máy tính để bàn và thiết bị di động

##### 3.2.5 Lưu trữ Dữ liệu
- Dữ liệu hồ sơ người dùng được lưu trữ đáng tin cậy trong Cơ sở dữ liệu Realtime của Firebase
- Hệ thống  xử lý hiệu quả các hoạt động đọc/ghi Firebase

### 4. Yêu cầu Giao diện Bên ngoài

#### 4.1 Giao diện Người dùng
- Trang chủ với NFT nổi bật và điều hướng
- Giao diện duyệt và tìm kiếm NFT
- Trang quản lý hồ sơ người dùng
- Giao diện tạo và đúc NFT
- Trang lịch sử giao dịch
- Giao diện kết nối và quản lý ví

#### 4.2 Giao diện Phần mềm
- Thư viện Solana Web3.js cho tương tác blockchain
- API ví Phantom cho kết nối ví
- API GameShift cho quản lý người dùng
- Cơ sở dữ liệu Realtime của Firebase để lưu trữ dữ liệu người dùng
- API Cloudinary để tải lên hình ảnh

#### 4.3 Giao diện Truyền thông
- HTTPS để truyền thông an toàn với API GameShift
- WebSocket để cập nhật thời gian thực từ Cơ sở dữ liệu Realtime của Firebase
- Cuộc gọi RPC đến các nút blockchain Solana

### 5. Yêu cầu Khác

#### 5.1 Cơ sở dữ liệu
- Cơ sở dữ liệu Realtime của Firebase cho hồ sơ người dùng và dữ liệu ứng dụng.
- Blockchain Solana cho dữ liệu NFT và giao dịch.

#### 5.2 Quy tắc Kinh doanh
- Người dùng đăng nhập để mua hoặc bán NFT
- Người sáng tạo sở hữu quyền đối với nội dung họ đúc thành NFT


#### 5.3 Yêu cầu Pháp lý
- Ứng dụng  tuân thủ các quy định liên quan đến tiền điện tử và NFT


