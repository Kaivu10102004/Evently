# Evently

Ứng dụng quản lý sự kiện và kết nối bạn bè, giao diện tiếng Việt.

## Chạy ứng dụng

Yêu cầu Node.js 18 trở lên. Không cần cài package ngoài.

```bash
npm start
```

Mở `http://localhost:3000`. Máy chủ socket TCP dùng giao thức JSON Lines lắng nghe tại `127.0.0.1:4000`.

## Socket JSON Lines

Mỗi yêu cầu là một JSON object trên một dòng, gồm `id`, `action`, `payload` và `token` (nếu đã đăng nhập). Phản hồi cũng là một JSON object trên một dòng. Ví dụ:

```json
{"id":"1","action":"register","payload":{"name":"Minh Anh","email":"minh@example.com","password":"matkhau123"}}
```

Dữ liệu được lưu tại `data.json` cạnh mã nguồn; có thể đổi bằng biến môi trường `DATA_FILE`. Web API ở `POST /api`, body có dạng `{ "action": "...", "payload": {} }`; token gửi trong `Authorization: Bearer ...`.
