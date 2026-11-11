# Evently

Ứng dụng quản lý sự kiện và kết nối bạn bè, giao diện tiếng Việt.

## Chạy ứng dụng

Yêu cầu Node.js 18 trở lên. Không cần cài package ngoài.

```bash
npm start
```

Mở `http://localhost:3000`. Máy chủ socket TCP dùng giao thức JSON Lines lắng nghe tại `127.0.0.1:4000`.

## Giao diện sự kiện

Mở `http://localhost:3000/#events` để khám phá sự kiện công khai. Danh sách mặc định hiển thị theo **dòng thời gian dọc**, nhóm theo ngày, ở tab **Sắp tới**. Bấm **Bộ lọc** cạnh ô tìm kiếm để mở bảng có nhóm mục bên trái và các ô chọn bên phải. Có thể chọn nhiều loại hoạt động, khoảng thời gian và khu vực, xem trước số kết quả rồi bấm **Áp dụng**. Đóng bảng sẽ bỏ các thay đổi chưa áp dụng; có thể gỡ từng điều kiện hoặc xóa tất cả. Bộ lọc dùng được cả khi chưa đăng nhập. Chuyển sang sự kiện đã qua để lọc 7/30 ngày gần đây. Khi tạo/sửa sự kiện, có thể chọn loại hoạt động và nhập khu vực.

Không cần đăng nhập để xem danh sách hoặc chi tiết sự kiện công khai. Khi chọn tham gia hoặc tạo sự kiện, ứng dụng mở popup đăng nhập. Đăng nhập thành công sẽ đưa bạn trở lại sự kiện đã chọn; yêu cầu tham gia vẫn cần được gửi riêng.

## Dữ liệu sự kiện mẫu

Dừng server trước khi tạo dữ liệu, sau đó chạy:

```bash
npm run seed:demo
npm start
```

Lệnh thêm 8 sự kiện công khai mẫu (7 sắp tới, 1 đã qua), dùng múi giờ Việt Nam và không tạo trùng khi chạy lại. Dữ liệu hiện có được giữ nguyên; bản sao trước khi thêm được lưu vào thư mục tạm. Sự kiện mẫu có mô tả nhận diện riêng. `data.json` vẫn được bỏ qua bởi Git.

## Kiểm tra

```bash
npm test
```

Bộ kiểm tra API dùng dữ liệu tạm, độc lập với `data.json` của ứng dụng.

## Socket JSON Lines

Mỗi yêu cầu là một JSON object trên một dòng, gồm `id`, `action`, `payload` và `token` (nếu đã đăng nhập). Phản hồi cũng là một JSON object trên một dòng. Ví dụ:

```json
{"id":"1","action":"register","payload":{"name":"Minh Anh","email":"minh@example.com","password":"matkhau123"}}
```

Dữ liệu được lưu tại `data.json` cạnh mã nguồn; có thể đổi bằng biến môi trường `DATA_FILE`. Web API ở `POST /api`, body có dạng `{ "action": "...", "payload": {} }`; token gửi trong `Authorization: Bearer ...`.
