# BlockProp × Captable — Integration & Domain Requirements

> **Purpose:** Full description of cap table domain, Captable capabilities (open-source back-office), and **mandatory requirements** for BlockProp (front-office: social + offering + invest).  
> **Use as:** Prompt / spec for the BlockProp team, architects, or AI when designing schema, APIs, and integration flows.  
> **Captable repo:** Next.js 14, tRPC, Prisma, PostgreSQL, MinIO, NextAuth.  
> **Reference date:** June 2026.

---

## 0. Executive summary

| Layer | System | Responsibility |
|-------|--------|----------------|
| **Front-office** | **BlockProp** (new build) | Community, offering, investment tiers, KYC, Reg A/D, payment, investor UX |
| **Back-office** | **Captable** (reuse ~30–40%) | Cap table, stakeholder, share class, issue shares, SAFE, eSign, audit, RBAC |

**Integration principles:**

1. BlockProp **owns** the investor journey (user, KYC, qualification, offering, payment).
2. Captable **owns** the legal cap table (stakeholder, SAFE, share, share class, documents).
3. Sync **after KYC** (stakeholder) and **after successful payment** (SAFE or share).
4. **BlockProp User ≠ Captable User/Member** (investors typically have no Captable admin access).
5. **Offering / fundraise round** does not exist in Captable — **must be built on BlockProp**.

---

## 1. Two-tier architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ BlockProp (investor-facing)                                      │
│  User, KYC, InvestorQualification, Offering, InvestmentTier,    │
│  InvestmentOrder, Payment, Community, Portfolio UI               │
└────────────────────────────┬────────────────────────────────────┘
                             │ Webhook / service account API
                             │ (after KYC → stakeholder; after pay → SAFE/share)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Captable (back-office)                                           │
│  Company, Stakeholder, ShareClass, Share, Safe, Document,      │
│  eSign, Audit, Member + RBAC                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Domain glossary (required reading)

### 2.1 Cap table

A record of **who owns how many shares / what %** of a company or SPV. Captable stores the source of truth; the **Cap table** UI page is currently **WIP**.

### 2.2 Company

A **legal entity / SPV** in Captable. All stakeholders, SAFEs, and share classes are tied to `companyId`.

- **BlockProp:** Each real estate project is typically **1 SPV = 1 Captable Company**.
- **BlockProp platform entity** may be a separate Company (do not mix with investor SPV cap tables).

### 2.3 SPV (Special Purpose Vehicle)

A company formed **solely to hold one asset/project** (e.g. Highpoint Commerce Center). Investors contribute capital to the **SPV**, not by taking title to the property personally.

### 2.4 User vs Member vs Stakeholder

| Concept | Login? | Role |
|---------|--------|------|
| **User** | Yes | System account |
| **Member** | Yes | User **within a Company** — admin team, RBAC |
| **Stakeholder** | Not required | Person on the **cap table** (investor, founder) |

**Rules:**

- `User ≠ Stakeholder` (not automatically 1:1).
- BlockProp investor = **BlockProp User** + **Captable Stakeholder** (same email, two records).
- Ops/admin = **User + Member** in Captable (RBAC).
- BlockProp users are **admin-created** (current requirement).

### 2.5 Share Class (Common / Preferred)

**Legal share type** defined by the **issuer** in the charter — **not** the $5k/$25k tiers on the Invest UI.

| Type | Prefix | Typical holders |
|------|--------|-----------------|
| COMMON | CS | Founders, employees, retail |
| PREFERRED | PS | VCs, institutions |

Important fields: `initialSharesAuthorized`, `votesPerShare`, `parValue`, `pricePerShare`, liquidation preference (preferred).

**BlockProp investment tier** = dollar amount; **Share class** = share type + rights.

### 2.6 Issue Share

A single **equity issuance**: `Stakeholder + ShareClass + quantity + certificateId + capital + dates + vesting`.

### 2.7 SAFE

**Simple Agreement for Future Equity** — a capital commitment, **not** shares yet. Linked to `stakeholderId` + `companyId`; **not** linked to a share class.

**SAFEs do not have vesting.**

### 2.8 Vesting

Shares/options **unlock over time** (`vestingYears`, `cliffYears`, `vestingStartDate` on **Share/Option**).

| Who | Vesting |
|-----|---------|
| Founder / employee | Usually yes (e.g. 4y, 1y cliff) |
| Reg A retail investor | **0** — fully vested at issuance |
| SAFE | Not applicable |

### 2.9 Offering (BlockProp only)

**One fundraise** for a project: target $, exemption, instrument, SAFE template (if applicable), tiers.

- **1 offering** → **many SAFEs** (or many share issuances) — one per investor / contribution.
- **1 offering** → **typically 1 SAFE template** for the entire round (investors do not pick contract type).

### 2.10 InvestmentTier (BlockProp only)

Fixed dollar amounts on the Invest UI ($5k, $10k, …). **Not** a share class.

### 2.11 KYC / InvestorQualification (BlockProp only)

| Model | Answers |
|-------|---------|
| **KycRecord** | Has the investor verified identity? |
| **InvestorQualification** | Eligible for Reg A / Reg D? What limits apply? |

**Order:** User → KYC approved → Captable Stakeholder → Invest (block if not eligible).

### 2.12 Reg A / Reg D

| Exemption | Characteristics |
|-----------|-----------------|
| REG_A_TIER2 | Retail allowed (limits based on income/net worth) |
| REG_D_506C | Accredited investors only |

Store qualification **per exemption** on BlockProp — **not** a single boolean on Stakeholder.

### 2.13 RBAC (Captable only)

**Admin team** permissions: Subject (`stakeholder`, `documents`, `members`…) × Action (`create|read|update|delete|*`). Role `ADMIN` or `CUSTOM`. **Investors do not have Captable RBAC.**

---

## 3. Captable — available modules & status

| Module | Menu / API | Status | Use in BlockProp? |
|--------|------------|--------|-------------------|
| Company | Onboarding | ✅ | ✅ 1 SPV = 1 company |
| Stakeholder | Sidebar, REST `/v1/{companyId}/stakeholders` | ✅ | ✅ Sync after KYC |
| Share Class | Sidebar, tRPC | ✅ | ✅ SPV setup before round |
| Issue Shares | Securities → Shares, REST `/v1/{companyId}/shares` | ✅ | ✅ After equity conversion |
| SAFE | Fundraise → SAFEs, tRPC (UI) | ✅ | ✅ Sync after payment |
| SAFE templates | 6 YC + CUSTOM | ✅ | Terms defined on Offering |
| eSign | Documents → eSign | ✅ | ⚠️ Depends on SAFE signing flow |
| Documents / MinIO | Upload | ✅ | ⚠️ |
| Audit | Audits | ✅ | ✅ |
| RBAC | Settings → Team | ✅ | Ops only |
| Cap table view | Sidebar | ⚠️ WIP | ❌ BlockProp builds own portfolio |
| Investments (round) | Fundraise → Investments | ⚠️ WIP | ❌ Build Offering on BlockProp |
| Offering / KYC / Reg | — | ❌ | ✅ Build on BlockProp |
| Token / on-chain ledger | — | ❌ | ✅ Build on BlockProp if needed |
| Payment | — | ❌ | ✅ Build on BlockProp |

### Captable REST API (service integration)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/companies` | List companies |
| GET | `/v1/companies/{id}` | Company detail |
| GET/POST | `/v1/{companyId}/stakeholders` | List / create stakeholders |
| GET/PATCH/DELETE | `/v1/{companyId}/stakeholders/{id}` | CRUD stakeholder |
| GET/POST | `/v1/{companyId}/shares` | List / create shares |
| GET/PATCH/DELETE | `/v1/{companyId}/shares/{id}` | CRUD share |

**No public REST API for SAFE yet** — SAFE integration today is via **internal tRPC** or requires **adding a REST endpoint** / UI automation. **BlockProp requirement:** expose `POST /v1/{companyId}/safes` or use a job queue for sync.

Auth: API key / member session (see `developer` RBAC subject, access tokens).

---

## 4. Captable schema (integration reference)

### 4.1 Stakeholder

```prisma
model Stakeholder {
  id                  String
  name                String
  email               String   @unique  // ⚠️ Should become @@unique([companyId, email]) for multi-SPV
  stakeholderType     INDIVIDUAL | INSTITUTION
  currentRelationship INVESTOR | FOUNDER | EMPLOYEE | ...
  companyId           String
  // address, taxId, ...
}
```

### 4.2 ShareClass

```prisma
classType: COMMON | PREFERRED
prefix: CS | PS
initialSharesAuthorized: BigInt
pricePerShare, parValue, votesPerShare, ...
```

### 4.3 Share

```prisma
stakeholderId, shareClassId, companyId
certificateId, quantity, capitalContribution
vestingYears, cliffYears, vestingStartDate
issueDate, boardApprovalDate
status: DRAFT | ACTIVE | ...
```

### 4.4 Safe

```prisma
publicId          // SAFE-01
stakeholderId, companyId
capital           // investment amount
status            DRAFT | ACTIVE | PENDING | EXPIRED | CANCELLED
type              PRE_MONEY | POST_MONEY
safeTemplate      // see section 5
valuationCap, discountRate, proRata, mfn
issueDate, boardApprovalDate
// MISSING: offeringId, exemption, blockpropOrderId → needs extension
```

---

## 5. SAFE templates (6 YC templates + Custom)

Declare **once on the Offering**; every SAFE in the round **copies the same terms**.

| Enum key | Label |
|----------|-------|
| `POST_MONEY_CAP` | Valuation Cap, no Discount |
| `POST_MONEY_DISCOUNT` | Discount, no Valuation Cap |
| `POST_MONEY_MFN` | MFN, no Valuation Cap, no Discount |
| `POST_MONEY_CAP_WITH_PRO_RATA` | Valuation Cap + Pro Rata |
| `POST_MONEY_DISCOUNT_WITH_PRO_RATA` | Discount + Pro Rata |
| `POST_MONEY_MFN_WITH_PRO_RATA` | MFN + Pro Rata |
| `CUSTOM` | Custom document upload |

**Required Offering fields when creating (if instrument = SAFE):**

- `instrumentType: SAFE`
- `safeType: POST_MONEY | PRE_MONEY`
- `safeTemplate` (one of 6 or CUSTOM)
- `valuationCap`, `discountRate`, `proRata`, `mfn`
- `exemption` (REG_A_TIER2, …)
- `targetAmount`, `minTicket`, `InvestmentTier[]`

---

## 6. BlockProp schema (build requirements)

### 6.1 Required tables

```text
User
  id, email, role (INVESTOR | OPS | ADMIN)
  blockprop-specific profile
  captableStakeholderIds[] or map per company

KycRecord
  userId, status (PENDING|APPROVED|REJECTED|EXPIRED)
  vendorRef, documents, reviewedAt

InvestorQualification
  userId, exemption (REG_A_TIER2 | REG_D_506C | ...)
  status (ELIGIBLE|INELIGIBLE|EXPIRED)
  isAccredited, regAMaxAmount, regAUsedAmount
  determinedAt, expiresAt, basis (JSON)

Project / Asset
  id, name, description, location
  captableCompanyId          // link SPV

Offering                          // one fundraise round
  id, projectId
  captableCompanyId
  title, status (DRAFT|OPEN|CLOSED|CANCELLED)
  exemption
  targetAmount, raisedAmount
  instrumentType (SAFE | EQUITY | ...)
  // SAFE terms (required if SAFE):
  safeType, safeTemplate, valuationCap, discountRate, proRata, mfn
  // EQUITY terms (if equity):
  captableShareClassId, pricePerShare
  openAt, closeAt

InvestmentTier
  offeringId, amount, label, sortOrder, isActive

InvestmentOrder
  id, offeringId, userId, tierId
  amount, status (PENDING|PAYMENT_PENDING|PAID|FAILED|CANCELLED)
  qualificationId          // snapshot at invest time
  kycSnapshotId
  paymentRef
  captableSafeId | captableShareId   // after sync
  captableStakeholderId
```

### 6.2 InvestmentOrder state flow

```
CREATED → KYC_CHECK → QUALIFICATION_CHECK → PAYMENT → PAID → SYNC_CAPTABLE → COMPLETE
```

---

## 7. Mandatory integration flows

### 7.1 Project setup (ops, once per SPV)

1. Legal counsel forms the **SPV**.
2. Captable: create **Company**.
3. Captable: create **Share Class** (usually Common; Preferred if needed).
4. Captable: **Issue shares** to founders/GP (**with vesting** if required).
5. BlockProp: create **Project** + link `captableCompanyId`.
6. BlockProp: create **Offering** (instrument, SAFE template or equity, Reg A, target, tiers).

### 7.2 Onboard investor

1. Admin creates **User** on BlockProp.
2. User completes **KYC** → `KycRecord APPROVED`.
3. System computes **InvestorQualification** per exemption.
4. **Sync Captable:** `POST /stakeholders` → store `captableStakeholderId` on User/Order.

### 7.3 Invest (single contribution within an offering)

1. User selects **tier** → `InvestmentOrder`.
2. Validate: KYC, qualification for `offering.exemption`, amount ≤ Reg A limit, offering has remaining capacity.
3. **Payment** succeeds.
4. **Sync Captable:**
   - If `instrumentType = SAFE`: create **Safe** (`capital = amount`, copy `safeTemplate`/terms from Offering).
   - If `instrumentType = EQUITY`: create **Share** (`quantity = amount / pricePerShare`, `vestingYears = 0`).
5. Update `offering.raisedAmount`, `regAUsedAmount`.
6. (Optional) eSign SAFE via Captable.

### 7.4 Close round / convert (later)

1. Offering → `CLOSED`.
2. Legal counsel converts SAFE → shares.
3. Captable: **Issue share** per investor (`vesting = 0`).
4. BlockProp: update investor portfolio.

---

## 8. End-to-end example: Highpoint $200k (with vesting)

### Characters

| Person | BlockProp | Captable | Vesting |
|--------|-----------|----------|---------|
| Minh | Admin | Member ADMIN + Stakeholder FOUNDER | 4y, cliff 1y |
| Lan | — | Stakeholder FOUNDER | 4y, cliff 1y |
| Alice, Bob, … | User INVESTOR | Stakeholder INVESTOR | 0 |

### Phase 0 — SPV setup

- Company: `Highpoint SPV LLC`
- Share Class: Common, 1M authorized
- Issue: Lan CS-1 400k shares, vesting 4/1; Minh CS-2 same
- BlockProp Offering: Reg A, $200k, SAFE POST_MONEY_CAP, cap $8M, tiers $5k–$25k

### Phase 1 — Alice

- Admin creates User → KYC pass → Qualification Reg A ELIGIBLE, Reg D INELIGIBLE
- Sync Stakeholder Alice

### Phase 2 — Round (many SAFEs, one offering)

| Investor | Tier | SAFE | capital |
|----------|------|------|---------|
| Alice | $10k | SAFE-01 | 10,000 |
| Bob | $25k | SAFE-02 | 25,000 |
| … | … | … | … |
| **Total** | | **~12 SAFEs** | **$200,000** |

Same `safeTemplate`, same `valuationCap` — only stakeholder + capital differ.

### Phase 3 — Convert

- Alice → Issue Share CS-3, 10,000 shares, vesting **0**
- Cap table: Founders 80% (vesting), investors 20% (fully vested)

---

## 9. Business rules (BlockProp checklist)

### Must have

- [ ] **Offering** model with instrument + SAFE terms or equity terms
- [ ] **InvestmentTier** (do not confuse with share class)
- [ ] **KycRecord** + gate before invest
- [ ] **InvestorQualification** per exemption (not a boolean on stakeholder)
- [ ] **InvestmentOrder** + payment + Captable sync
- [ ] Links: `captableCompanyId`, `captableStakeholderId`, `captableSafeId`/`captableShareId`
- [ ] One offering → many SAFEs/shares; **one SAFE template per offering**
- [ ] Investor **does not** choose contract type — only dollar tier
- [ ] Retail investor: **vesting = 0** on shares
- [ ] Service account / API key for Captable sync

### Do not confuse

- [ ] Dollar tier ≠ Share class
- [ ] Target $200k ≠ `initialSharesAuthorized`
- [ ] User ≠ Stakeholder
- [ ] One investment ≠ new stakeholder (same person, additional SAFE/order)
- [ ] KYC after payment (forbidden)
- [ ] Reg A/D as a single flag on stakeholder

### Captable extensions needed (proposed PRs)

- [ ] `Stakeholder`: `@@unique([companyId, email])` instead of `email @unique`
- [ ] `Safe`: `offeringExternalId`, `exemption`, `blockpropOrderId`
- [ ] `POST /v1/{companyId}/safes` REST API
- [ ] (Optional) `Stakeholder.userExternalId` to link BlockProp user

---

## 10. Instrument decision tree

```
Create Offering
  │
  ├─ instrumentType = SAFE
  │     → Declare safeTemplate + valuationCap + ...
  │     → Invest → sync Captable Safe
  │     → Convert later → Issue Share (vesting 0)
  │
  └─ instrumentType = EQUITY
        → Declare shareClassId + pricePerShare
        → Invest → sync Captable Share immediately (vesting 0)
```

---

## 11. BlockProp UI mapping

| UI | BlockProp backend | Captable |
|----|-------------------|----------|
| Community / posts | BlockProp | — |
| Offer page (Highpoint) | Project + Offering | Company metadata |
| Invest page tiers | InvestmentTier | — |
| Invest Now | InvestmentOrder + Payment | Safe or Share |
| Min $500 | offering.minTicket | — |
| Portfolio | Aggregate orders | SAFE + Share per stakeholder |
| Admin create user | User | — |
| Admin KYC review | KycRecord | — |
| Cap table ops | — | Captable dashboard |

---

## 12. Prompt template for AI / BlockProp developers

When prompting AI to build BlockProp, include:

```text
Context: BlockProp is the front-office (social + Reg A real estate crowdfunding).
Back-office cap table uses Captable (open-source).

Must implement:
1. Project linked to Captable Company (SPV per real estate deal)
2. Offering = one fundraise round with instrumentType, SAFE template OR equity,
   exemption, targetAmount, InvestmentTiers
3. KycRecord + InvestorQualification per exemption before invest
4. InvestmentOrder: validate → pay → sync Captable stakeholder + safe/share
5. One offering → many SAFEs (same template); tiers are dollar amounts only
6. Founders: vesting on shares in Captable; investors: vestingYears=0
7. Do NOT conflate User with Stakeholder or Member
8. REST sync to Captable: stakeholders, shares; safes need API extension

Reference: docs/BLOCKPROP-CAPTABLE-INTEGRATION-README.md in captable repo
Domain guide: docs/blockprop-domain-guide.md
```

---

## 13. Related documents in the Captable repo

| File | Contents |
|------|----------|
| `docs/BLOCKPROP-CAPTABLE-INTEGRATION-README.md` | This file — integration spec |
| `docs/blockprop-domain-guide.md` | Domain onboarding + E2E vesting |
| `docs/blockprop-domain-guide.docx` | Word export |
| `prisma/schema.prisma` | Database source of truth |
| `prisma/enums.ts` | Generated enums |
| `src/lib/rbac/README.md` | RBAC usage |
| `src/server/api/routes/` | REST API v1 |

---

## 14. Captable dev environment (reference)

```bash
docker compose up -d
docker compose exec app pnpm db:migrate
docker compose exec app pnpm db:seed
# Login: ceo@example.com / P@ssw0rd!
```

Services: App `localhost:3000`, Mailpit `8025`, MinIO `9001`.

---

*Compiled from Captable codebase analysis and BlockProp design. Review with legal/compliance before production (Reg A, SPV structure, instrument choice).*
