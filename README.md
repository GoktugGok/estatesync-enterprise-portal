# 🚀 EstateSync Enterprise Portal
EstateSync is an enterprise-grade management platform designed to digitize real estate post-sale processes (escrow, title deeds, payment flows) and accurately automate complex commission distribution rules.

This project is built using the **NestJS + Nuxt 3 + MongoDB Atlas** tech stack, adhering to modern software architecture principles and high user experience (UX) standards.

## 🌟 Key Features
- **Automated Commission Management**: Flawlessly calculates the 50% - 25% - 25% (Agency / Listing Agent / Selling Agent) sharing rules.
- **Transaction Lifecycle (Stage Engine)**: Tracks the entire process from agreement to title deed using a linear state machine.
- **Financial Transparency & Traceability**: Provides detailed financial breakdowns and audit logs for every transaction.
- **Advanced Dashboard & Analytics**: Visualizes agent performance and company profitability with Apple-style minimalist charts.
- **Role-Based Access Control**: Ensures a secure environment with the "Viewable by all, editable by responsible parties" philosophy.

## 🏗️ Technical Architecture
- **Backend**: NestJS (Modular Architecture), JWT Authentication, MongoDB (Mongoose), Jest (Unit Tests).
- **Frontend**: Nuxt 3 (SSR/SPA), Pinia (State Management), Tailwind CSS, Headless UI.
- **Database**: MongoDB Atlas (Cloud).

## 🚀 Live Demo Links
*Note: The system is deployed for case evaluation purposes.*

- **Frontend (Live)**: `[YOUR_VERCEL_OR_RENDER_LINK_HERE]`
- **API (Live)**: `[YOUR_RENDER_OR_RAILWAY_LINK_HERE]`

## 💻 Local Installation Instructions

### 1. Backend Setup
```bash
cd real-estate-backend
npm install
```
Create a `.env` file and define the following variables:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/estatesync
JWT_SECRET=super_secret_antigravity_key
```
To run:
```bash
npm run start:dev
```
To run unit tests (19+ Tests):
```bash
npm run test
```

### 2. Frontend Setup
```bash
cd real-estate-frontend
npm install
```
Create a `.env` file:
```env
NUXT_PUBLIC_API_BASE=http://localhost:3000
```
To run:
```bash
npm run dev
```

## 📁 Project Documentation
For technical details, architectural decisions, and design principles, please check:
- **DESIGN.md**: Architectural decisions, data models, and authorization design.
- **Unit Tests**: Found under `src/**/*.spec.ts` for commission and stage transition tests.

## 💡 Developer Note (On Security)
This repository interacts with production APIs. Database connection strings and secret keys are never hardcoded; they are managed entirely via Environment Variables. The database used for the live demo is an isolated MongoDB Atlas cluster sanitized of personal data.

---
*Prepared by Göktuğ Gök as an Engineering Challenge.* 🚀🔥
