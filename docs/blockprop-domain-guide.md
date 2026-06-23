# Tài liệu Domain Knowledge: Cap Table, Gọi vốn & Tích hợp BlockProp × Captable

*Tài liệu onboarding cho người mới — tổng hợp khái niệm, vai trò, luồng vận hành và map giữa sản phẩm investor-facing (BlockProp) với back-office (Captable).*

---

## 1. Bức tranh tổng thể

### 1.1 Hai lớp hệ thống

| Lớp | Ví dụ | Nhiệm vụ |
|-----|--------|----------|
| **Front-office** | BlockProp (design) | Mạng xã hội, offering, tier invest, KYC, thanh toán, Reg A/D |
| **Back-office** | Captable (open-source) | Cap table, stakeholder, SAFE, cổ phần, eSign, audit, RBAC |

**Luồng:** Nhà đầu tư → BlockProp (Invest Now, community) → API/webhook (sau KYC + thanh toán) → Captable (Stakeholder, SAFE, Share, audit).

### 1.2 Ví dụ công ty

- **BlockProp** — nền tảng fractional hóa BĐS.
- **Highpoint Commerce Center** — một **offering** (dự án kho bãi Florida), mục tiêu ví dụ **$200k**, tier **$5k–$25k**, min **$500**.

---

## 2. Các nhân vật và vai trò

| Khái niệm | Là ai? | Đăng nhập? | Trong Captable | Trong BlockProp |
|-----------|--------|------------|----------------|-----------------|
| **User** | Tài khoản hệ thống | Có | `User` | User (admin tạo) |
| **Member** | User trong một công ty, có quyền quản trị | Có | `Member` + RBAC | Ops / issuer / admin |
| **Stakeholder** | Người trên sổ vốn (investor, founder…) | Không bắt buộc | `Stakeholder` | Investor sau KYC |
| **Investor (BlockProp)** | User có role invest | Có (BlockProp) | Thường = Stakeholder | User + KYC |

**Quy tắc vàng:**

- **User ≠ Stakeholder** (không 1-1 tự động).
- **Investor** trên cap table = **Stakeholder**; login app = **User** (có thể cùng email, hai bản ghi).
- **Admin / team** = User + **Member**; không cần là Stakeholder.

---

## 3. Từ điển khái niệm cốt lõi

### 3.1 Cap table (bảng quyền sở hữu)

Ghi **ai sở hữu bao nhiêu % / bao nhiêu cổ** của công ty hoặc SPV. Captable quản lý dữ liệu này; trang Cap table trong app hiện vẫn **WIP**.

### 3.2 Company

Một pháp nhân / SPV trong Captable. Mọi stakeholder, SAFE, share class gắn `companyId`. Mỗi dự án BĐS có thể = 1 SPV = 1 Company.

### 3.3 Stakeholder

Hồ sơ người/tổ chức liên quan vốn: tên, email, loại (`INDIVIDUAL` / `INSTITUTION`), relationship (`INVESTOR`, `FOUNDER`, `EMPLOYEE`…). Gắn SAFE, Share, Option, Investment. Email hiện unique toàn DB — multi-SPV cần `@@unique([companyId, email])`.

### 3.4 Share Class (Common / Preferred)

**Định nghĩa loại cổ phiếu**, chưa ai sở hữu cụ thể.

| Loại | Ý nghĩa | Prefix |
|------|---------|--------|
| **COMMON** | Cổ phổ thông (founder, nhân viên, retail) | CS |
| **PREFERRED** | Cổ ưu đãi (ưu tiên thanh lý, institutional) | PS |

`initialSharesAuthorized` = số cổ **được phép** phát hành — không phải mục tiêu gọi $200k.

### 3.5 Issue Share (phát hành cổ)

Một lần **cấp cổ thật** cho stakeholder: số lượng, certificate ID, tiền góp, ngày, vesting.

`Share = Stakeholder + Share Class + quantity + certificateId + ...`

### 3.6 SAFE

**Simple Agreement for Future Equity** — cam kết đầu tư, **chưa** là cổ phần ngay. Có `capital`, valuation cap, discount. Gắn Stakeholder + Company; không gắn Share Class.

### 3.7 Vesting

Cổ/option **mở khóa dần** theo thời gian (`vestingYears`, `cliffYears`). Founder/nhân viên thường có vesting; retail investor Reg A thường `vestingYears = 0`.

### 3.8 Offering (BlockProp)

Cơ hội đầu tư: Highpoint, target $200k, tier $5k–$25k. **Tier $ ≠ Share Class** — là mức tiền invest. Chưa có trong Captable.

### 3.9 KYC

Xác minh danh tính (AML). Thuộc BlockProp. Thứ tự: Admin tạo User → KYC → Stakeholder → Invest → SAFE/Share.

### 3.10 Reg A / Reg D

| Exemption | Đặc điểm |
|-----------|----------|
| **Reg A** | Non-accredited được (có giới hạn) |
| **Reg D 506(c)** | Chỉ accredited |

Lưu `InvestorQualification` theo exemption trên BlockProp; không nên 1 boolean trên Stakeholder.

### 3.11 RBAC

Phân quyền team Captable: Subject × Action (`stakeholder:read`, `documents:*`…). Role ADMIN hoặc CUSTOM. Stakeholder/investor **không** có RBAC.

---

## 4. Quan hệ giữa các khái niệm

- **Company** có nhiều **Stakeholder**, **ShareClass**, **Safe**, **Share**.
- **User** → **Member** → **Company** (RBAC).
- **Stakeholder** → nhiều **Safe** / **Share**.
- **Share** = **Stakeholder** + **ShareClass**.
- **Safe** chỉ gắn **Stakeholder** (không Share Class).
- **Offering BlockProp** map tới Company/SPV; **InvestmentOrder** sync thành Safe/Share.

---

## 5. Ví dụ end-to-end: Highpoint $200k

### 5.1 Nhân vật

| Người | Vai trò | Vesting? |
|-------|---------|----------|
| **Minh** | CEO, Member ADMIN + Stakeholder FOUNDER | ✅ Cổ founder có vesting |
| **Lan** | Co-founder, Stakeholder FOUNDER | ✅ Cổ founder có vesting |
| **Alice, Bob, …** | Investor, User BlockProp + Stakeholder INVESTOR | ❌ SAFE / cổ retail không vesting |

### 5.2 Giai đoạn 0 — Thiết lập SPV & cổ founder (có vesting)

**Bước 0.1–0.3:** Tạo SPV → Company `Highpoint SPV LLC` → Share Class **Common** (authorized 1,000,000 cổ).

**Bước 0.4 — Issue cổ founder với vesting**

Captable: **Securities → Shares → Create**, bước **Relevant dates**:

| Field | Lan (CS-1) | Minh (CS-2) |
|-------|------------|-------------|
| Stakeholder | Lan, FOUNDER | Minh, FOUNDER |
| Share class | Common | Common |
| Quantity | 400,000 | 400,000 |
| **vestingYears** | **4** | **4** |
| **cliffYears** | **1** | **1** |
| **vestingStartDate** | 2026-01-01 | 2026-01-01 |
| issueDate | 2026-01-01 | 2026-01-01 |
| Status | ACTIVE | ACTIVE |

**Vesting nghĩa là gì trong ví dụ này?**

- Lan & Minh **được cấp** 400k cổ mỗi người trên sổ, nhưng **quyền sở hữu thật** mở khóa dần:
  - **Tháng 0–12 (cliff):** chưa vest cổ nào — nếu nghỉ sớm thường mất phần lớn.
  - **Hết tháng 12:** ~25% (100k cổ) vested.
  - **Năm 2–4:** thêm dần đến 100% (400k cổ).

**Cap table “trên giấy” vs “đã vest” (tháng 6, giữa cliff):**

| Người | Cổ trên sổ | Đã vest | Chưa vest |
|-------|------------|---------|-----------|
| Lan | 400,000 | **0** | 400,000 |
| Minh | 400,000 | **0** | 400,000 |

→ Founder có cổ trên cap table nhưng **chưa “ăn chắc”** hết; investor retail sau này **không** bị ràng buộc kiểu này.

**Bước 0.5:** Tạo **Offering** BlockProp (Reg A, target $200k, tier $5k–$25k). Offering **không** có vesting — vesting chỉ gắn **Issue Share / Option** trong Captable.

---

### 5.3 Giai đoạn 1 — Investor (chưa có vesting)

Admin tạo User Alice → **KYC pass** → **Stakeholder** Alice (`INVESTOR`).

Chưa có SAFE, chưa có cổ → **chưa liên quan vesting**.

---

### 5.4 Giai đoạn 2 — Một lần gọi vốn $200k (SAFE — không vesting)

Alice Invest **$10k** → **SAFE-01** (`capital: 10_000`, template POST_MONEY_CAP).

Bob **$25k** → **SAFE-02**. … đến **~$200k**, **~12 SAFE** trong **cùng một offering / round**.

| Loại | Vesting? | Lý do |
|------|----------|--------|
| **SAFE** | **Không** | SAFE là cam kết tiền, chưa phải cổ; model `Safe` không có `vestingYears` |
| **Retail Reg A** | **Không** | Trả tiền → nhận quyền theo deal; không “chờ 4 năm” như founder |

**Cap table sau giai đoạn 2 (chưa convert):**

| Người | Loại | Số tiền / cổ | Vesting |
|-------|------|--------------|---------|
| Lan | Common CS-1 | 400k cổ (sổ) | 4y / cliff 1y |
| Minh | Common CS-2 | 400k cổ (sổ) | 4y / cliff 1y |
| Alice | SAFE-01 | $10k | — |
| Bob | SAFE-02 | $25k | — |
| … | SAFE | … | — |

Investor **chưa có cổ**, nên **chưa có** vesting trên share.

---

### 5.5 Giai đoạn 3 — Convert SAFE → Issue Share (investor: vesting = 0)

Luật sư close round: $200k → **200,000 cổ Common** @ $1/cổ (ví dụ).

**Alice — Issue Share sau convert:**

| Field | Giá trị |
|-------|---------|
| Certificate | CS-3 |
| Quantity | 10,000 |
| capitalContribution | 10,000 |
| **vestingYears** | **0** |
| **cliffYears** | **0** |
| vestingStartDate | *(để trống hoặc = issueDate)* |

→ Alice **sở hữu ngay** 10k cổ; không cliff.

Lặp Bob (CS-4, 25k cổ, vesting 0), …

**Cap table sau convert (fully issued ví dụ 1M cổ):**

| Người | Cổ | % | Vesting |
|-------|-----|---|---------|
| Lan | 400,000 | 40% | 4y, cliff 1y — **phần lớn chưa vest nếu mới 1 năm** |
| Minh | 400,000 | 40% | 4y, cliff 1y |
| 12 investors | 200,000 | 20% | **0** — full ngay |

**Fully diluted %** tính trên tổng cổ đã issue; **quyền bán/chuyển nhượng** founder có thể bị giới hạn bởi vesting + operating agreement (ngoài Captable).

---

### 5.6 Mốc thời gian vesting founder (timeline)

Giả sử vestingStartDate = **2026-01-01**, 4 năm, cliff 1 năm:

| Thời điểm | Sự kiện | Lan vested |
|------------|---------|------------|
| 2026-06 | Round Reg A đang gom SAFE | 0 cổ |
| **2027-01** | Hết cliff 1 năm | **~100,000** cổ (25%) |
| 2028-01 | Năm 2 | ~200,000 |
| 2029-01 | Năm 3 | ~300,000 |
| **2030-01** | Hết 4 năm | **400,000** (100%) |

Trong lúc đó Alice (2026-06 invest, 2026-09 convert) đã có **10k cổ full** từ ngày issue — **không** chờ vesting.

---

### 5.7 Ai có vesting trong toàn bộ ví dụ?

```
Highpoint Round 1
  │
  ├── Founder (Lan, Minh)
  │     └── Issue Share CS-1, CS-2 → vestingYears=4, cliffYears=1  ✅
  │
  ├── Retail investor (Alice, Bob, …)
  │     ├── Giai đoạn SAFE → không vesting
  │     └── Sau convert CS-3… → vestingYears=0  ❌
  │
  └── GP / sponsor carry (nếu có sau) → tùy deal, thường vesting riêng
```

**BlockProp UI:** investor **không thấy** vesting — chỉ thấy tier $ và Invest Now.

**Captable:** nhập vesting ở wizard **Issue share → Relevant dates** (founder); investor để **0**.

---

### 5.8 Alice invest 2 dự án (vesting không đổi)

- **Cùng SPV:** 1 Stakeholder, nhiều SAFE; cổ sau convert vẫn **vesting = 0**.
- **SPV khác:** Stakeholder mới per company; founder **mỗi SPV** có thể issue cổ + vesting riêng.

---

### 5.9 Checklist vesting trong E2E

| Bước | Hành động | Vesting |
|------|-----------|---------|
| 0.4 | Issue cổ Lan, Minh | 4y, cliff 1y |
| 2 | SAFE Alice, Bob | Không áp dụng |
| 3 | Issue cổ investor sau convert | **0 / 0** |
| *(tuỳ chọn)* | Cấp option nhân viên SPV | Option có vesting riêng (module Options Captable) |

---

## 6. Map BlockProp UI → Captable

| BlockProp UI | Captable |
|--------------|----------|
| Community / posts | Build mới |
| Offer page | Offering metadata |
| Tier $5k–$25k | SAFE.capital / Share |
| Invest Now | SAFE hoặc Issue Share |
| KYC | BlockProp DB |
| Portfolio | Aggregate SAFE/Share |

---

## 7. Luồng quyết định

**SAFE:** chưa cấp cổ, cam kết convert sau.

**Issue Share:** cổ thật, priced round, SPV đã close.

**Thứ tự Captable:** Stakeholder → Share Class → Issue Share; hoặc Stakeholder → SAFE.

**Thứ tự BlockProp:** User → KYC → Stakeholder → Invest + payment → SAFE/Share.

---

## 8. Captable modules

| Module | Trạng thái |
|--------|------------|
| Stakeholders, Share classes, Shares, SAFEs, eSign, RBAC | Có |
| Cap table view, Investments | WIP |
| Offering, KYC, Reg A/D | BlockProp |

**Login dev:** ceo@example.com / P@ssw0rd! (sau seed).

---

## 9. Mở rộng gợi ý BlockProp

**BlockProp:** Offering, InvestmentTier, InvestmentOrder, InvestorQualification, KycRecord.

**Sync Captable:** Stakeholder, Safe/Share, optional exemption snapshot.

**Sửa Captable:** `@@unique([companyId, email])`, `offeringExternalId` trên Safe.

---

## 10. Bảng ôn tập

| Khái niệm | Một câu |
|-----------|---------|
| User | Tài khoản login |
| Member | User trong company + RBAC |
| Stakeholder | Người trên cap table |
| Share Class | Loại cổ (Common/Preferred) |
| Issue Share | Cấp cổ thật |
| SAFE | Cam kết tiền, chưa cổ |
| Vesting | Mở khóa cổ theo thời gian |
| Offering | Dự án gọi vốn (BlockProp) |
| Tier $ | Mức tiền invest |
| KYC | Verify trước invest |
| Reg A/D | Exemption — ai được mua |
| RBAC | Quyền team admin |

---

## 11. Sai lầm thường gặp

1. User = Stakeholder
2. Tier $ = Share Class
3. Mục tiêu $200k = initialSharesAuthorized
4. Mỗi invest = stakeholder mới
5. KYC sau thu tiền
6. Reg A/D = 1 boolean trên Stakeholder
7. Investor cần RBAC Captable

---

*Tài liệu phản ánh Captable + thiết kế BlockProp đã thảo luận. Review pháp lý trước khi triển khai production.*
