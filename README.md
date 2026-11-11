# Evently

Ứng dụng quản lý sự kiện và kết nối bạn bè, giao diện tiếng Việt.

## Chạy ứng dụng

Yêu cầu Node.js 18 trở lên. Không cần cài package ngoài.

```bash
npm start
```

Mở `http://localhost:3000`. Máy chủ socket TCP dùng giao thức JSON Lines lắng nghe tại `127.0.0.1:4000`.

## Giao diện sự kiện

Mở `http://localhost:3000/#events` để khám phá sự kiện công khai. Danh sách mặc định hiển thị theo **dòng thời gian dọc**, nhóm theo ngày, ở tab **Sắp tới**. Có thể tìm theo tên/địa điểm và chuyển sang sự kiện đã qua.

Không cần đăng nhập để xem danh sách hoặc chi tiết sự kiện công khai. Khi chọn tham gia hoặc tạo sự kiện, ứng dụng mở popup đăng nhập. Đăng nhập thành công sẽ đưa bạn trở lại sự kiện đã chọn; yêu cầu tham gia vẫn cần được gửi riêng.

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
