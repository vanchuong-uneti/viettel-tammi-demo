const express = require('express');
const path = require('path');
const app = express();

// Cấu hình middleware đọc JSON và phục vụ file tĩnh trong thư mục public
app.use(express.json());
app.use(express.static('public'));

// 1. Tuyến đường phục vụ file giao diện index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. Dữ liệu giả lập bộ nhớ tạm (In-memory Mock Database)
let userAccount = {
  phone_number: "0981234567",
  subscriber_type: "PREPAID",
  main_balance: 150000,
  viettel_plus_points: 2500, // Điểm tích lũy Viettel++
  active_package: {
    package_id: "SD135",
    package_name: "Gói SD135",
    total_data_mb: 153600,
    remaining_data_mb: 42500,
    expire_time: "2026-10-15T23:59:59Z"
  }
};

const packagesCatalog = {
  "SD135": { package_id: "SD135", name: "Gói SD135", price: 135000, data_mb: 153600, duration_days: 30 },
  "ST90K": { package_id: "ST90K", name: "Gói ST90K", price: 90000, data_mb: 30720, duration_days: 30 }
};

// 3. API 1: Tra cứu thông tin Dashboard Thuê bao
app.get('/api/v1/telecom/dashboard', (req, res) => {
  return res.status(200).json({ 
    code: 200, 
    message: "Success", 
    data: userAccount 
  });
});

// 4. API 2: Đăng ký Gói cước (Trừ tiền tài khoản gốc)
app.post('/api/v1/packages/subscribe', (req, res) => {
  const { package_id } = req.body;
  const selectedPackage = packagesCatalog[package_id];

  if (!selectedPackage) {
    return res.status(400).json({ code: 4001, message: "Gói cước không tồn tại" });
  }

  if (userAccount.main_balance < selectedPackage.price) {
    return res.status(400).json({ 
      code: 4002, 
      message: "Tài khoản gốc không đủ. Vui lòng nạp thêm tiền." 
    });
  }

  userAccount.main_balance -= selectedPackage.price;
  
  const now = new Date();
  const expireDate = new Date(now.setDate(now.getDate() + selectedPackage.duration_days));

  userAccount.active_package = {
    package_id: selectedPackage.package_id,
    package_name: selectedPackage.name,
    total_data_mb: selectedPackage.data_mb,
    remaining_data_mb: selectedPackage.data_mb,
    expire_time: expireDate.toISOString()
  };

  return res.status(200).json({
    code: 200,
    message: "Đăng ký gói cước thành công",
    data: {
      transaction_id: "TXN_" + Date.now(),
      package_id: selectedPackage.package_id,
      deducted_amount: selectedPackage.price,
      new_main_balance: userAccount.main_balance,
      expire_time: userAccount.active_package.expire_time
    }
  });
});

// 5. API 3: Đổi 1.000 điểm Viettel++ lấy 10.000 VNĐ tài khoản gốc
app.post('/api/v1/loyalty/redeem', (req, res) => {
  if (userAccount.viettel_plus_points < 1000) {
    return res.status(400).json({ 
      code: 4003, 
      message: "Điểm Viettel++ không đủ (Cần tối thiểu 1.000 điểm)." 
    });
  }

  userAccount.viettel_plus_points -= 1000;
  userAccount.main_balance += 10000;

  return res.status(200).json({
    code: 200,
    message: "Đổi 1.000 điểm Viettel++ thành công! (+10.000 VNĐ)",
    data: {
      new_balance: userAccount.main_balance,
      remaining_points: userAccount.viettel_plus_points
    }
  });
});

// 6. Khởi chạy Server ở Port 3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server Mock API đang chạy tại: http://localhost:${PORT}`);
});