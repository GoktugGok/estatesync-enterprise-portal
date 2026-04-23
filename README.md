# 🚀 EstateSync Enterprise Portal

EstateSync is a high-performance enterprise management platform designed to digitize real estate post-sale workflows (escrow, title deeds, payment flows) and automate complex commission distribution logic with absolute precision.

Built for scalability and transparency, the system ensures that every financial stakeholder—from the agency to the listing and selling agents—has a clear, auditable breakdown of their earnings.

---

# 🌟 Key Features

* **Automated Commission Engine**
  Flawlessly calculates the 50% - 25% - 25% (Agency / Listing Agent / Selling Agent) sharing rules.

* **Transaction Lifecycle (Stage Engine)**
  Tracks the entire process from `Agreement` → `Earnest Money` → `Title Deed` → `Completed` using a linear state machine.

* **Financial Transparency**
  Provides real-time detailed earnings breakdowns for agency and agents, visualized in a premium interface.

* **Advanced Dashboard & Analytics**
  Clean admin panel with operational summaries, deal volume tracking, and financial reporting.

* **Role-Based Access Control (RBAC)**
  Secure "Viewable by all, editable by responsible parties" environment with Admin and Agent roles.

---

# 🏗️ Technical Architecture

## Backend (NestJS)
* **Framework**: NestJS (Modular Architecture)
* **Language**: TypeScript
* **Database**: MongoDB Atlas with Mongoose
* **Auth**: JWT Authentication & Bcrypt hashing
* **Testing**: Jest (Comprehensive unit tests for business logic)

## Frontend (Nuxt 3)
* **Framework**: Nuxt 3 (SSR/SPA Hybrid)
* **State**: Pinia (Centralized transaction and auth state)
* **Styling**: Tailwind CSS
* **Design**: Custom modern components with smooth animations

---

# 🚀 Live Demo Links

## Frontend
[https://estatesync-enterprise-portal.vercel.app](https://estatesync-enterprise-portal.vercel.app)

## Backend API
[https://estatesync-enterprise-portal.up.railway.app](https://estatesync-enterprise-portal.up.railway.app)

---

# 🔐 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@admin.com` | `admin123` |
| **Agent** | `john@gmail.com` | `12345678` |

---

# 📌 Core Business Rules

## 1. Commission Policy
| Scenario | Agency | Listing Agent | Selling Agent |
| :--- | :--- | :--- | :--- |
| **Same Agent** | 50% | 50% | 0% |
| **Different Agents** | 50% | 25% | 25% |

## 2. Transaction Stages
Transactions follow a strict forward-only sequence:
`agreement` → `earnest_money` → `title_deed` → `completed`

---

# 📡 API Documentation

Protected routes require JWT authentication via `Authorization: Bearer <token>`.

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | User login (returns JWT) | Public |
| `POST` | `/auth/register` | Register new user | Public |
| `GET` | `/transactions` | List all transactions | JWT |
| `POST` | `/transactions` | Create new transaction | JWT |
| `PATCH` | `/transactions/:id/status` | Update stage / assign agent | **JWT + Owner** |
| `GET` | `/users` | List all agents | Public |
| `GET` | `/users/:id` | View agent performance | Public |

---

# 🌐 Frontend Pages

| Page | Path |
| :--- | :--- |
| **Dashboard** | `/` |
| **Transaction List** | `/transactions` |
| **Create Deal** | `/transactions/create` |
| **Manage Deal** | `/transactions/manage-:id` |
| **Agent Directory** | `/agents` |
| **Agent Profile** | `/agents/:id` |

---

# 💻 Local Installation

### 1. Backend Setup
```bash
cd real-estate-backend
npm install
```
Create `.env`:
```env
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_key
PORT=3000
```
Run:
```bash
npm run start:dev
```

### 2. Frontend Setup
```bash
cd real-estate-frontend
npm install
```
Create `.env`:
```env
NUXT_PUBLIC_API_BASE=http://localhost:3000
```
Run:
```bash
npm run dev
```

---

# 🧪 Running Tests
The core business logic (commissions and stage transitions) is heavily tested.
```bash
cd real-estate-backend
npm run test
```
*Tests cover: Commission calculation edge cases, stage transition validity, and ownership-based authorization.*

---

# 📁 Project Documentation
* `DESIGN.md` — Deep dive into architectural decisions and data modeling.
* `real-estate-backend/src/**/*.spec.ts` — Unit test implementations.

---

# 👨‍💻 Author
Prepared by **Göktuğ Gök** as a Technical Case Study. 🚀

