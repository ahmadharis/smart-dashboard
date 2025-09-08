# Smart Dashboard

> A modern multi-tenant data visualization platform that transforms XML data into interactive dashboards

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)](https://www.docker.com/)

## ✨ What is Smart Dashboard?

Smart Dashboard is an enterprise-grade platform that automatically converts XML data into beautiful, interactive visualizations. Perfect for businesses that need to transform raw data feeds into meaningful dashboards for decision-making.

**Key Features:**

- 🏢 **Multi-tenant architecture** with complete data isolation
- 📊 **Automatic chart generation** from XML data structures
- 🔄 **Live data updates** with seamless dataset replacement
- 🔗 **Public dashboard sharing** with secure token-based access
- 📺 **TV mode** for full-screen presentations
- 🛡️ **Enterprise security** with JWT authentication and rate limiting

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (recommended) or Node.js 18+
- Supabase account for authentication and database

### 1. Clone & Setup

```bash
git clone <repository-url>
cd smart-dashboard
cp .env.local .env.local  # Copy and edit with your Supabase credentials
```

### 2. Start Development Environment

```bash
# With Docker (recommended)
npm run docker:dev

# Or traditional Node.js
npm install && npm run dev
```

Visit `http://localhost:3000` to see your dashboard! 🎉

## 🐳 Development with Docker

Docker provides the fastest, most reliable development experience:

### Development Commands

```bash
npm run docker:dev              # Start with hot reload
npm run docker:dev:detached     # Run in background
npm run docker:dev:logs         # View logs
npm run docker:dev:down         # Stop containers
npm run docker:rebuild          # Clean rebuild
```

### Production Commands

```bash
npm run docker:prod:build       # Build production image
npm run docker:prod             # Run production container
```

### VSCode Integration

For the best development experience:

1. Install the **Dev Containers** extension
2. Press `Ctrl+Shift+P` → "Dev Containers: Reopen in Container"
3. Enjoy a fully configured development environment!

## ⚙️ Configuration

### Environment Variables

Create `.env.local` with your Supabase credentials:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# Optional Settings
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
PORT=3000
```

### Database Setup

Execute the SQL migration scripts in your Supabase dashboard in this exact order:

```sql
-- Core Schema (Required)
scripts/001_create_tenants_table.sql
scripts/002_create_users_table.sql
scripts/003_create_dashboards_table.sql
scripts/004_create_data_files_table.sql
scripts/005_create_settings_table.sql
scripts/006_create_user_profiles_table.sql
scripts/007_create_user_tenants_table.sql
scripts/010_create_public_dashboard_shares.sql
scripts/011_add_public_sharing_setting.sql

-- Security Policies (CRITICAL - Required before production)
scripts/012_enable_row_level_security.sql
```

> **⚠️ Security Notice**: The `012_enable_row_level_security.sql` script is **CRITICAL** for production deployment. Without it, users can access data from all tenants. Always run this script before going live.

## 📡 External System Integration

### 🎯 Upload XML API - Primary Integration Point

The `/api/upload-xml` endpoint is the **primary interface** for external systems to push data into Smart Dashboard. This is where your data pipelines, ETL tools, and business systems send XML data to create beautiful visualizations.

#### Basic cURL Example

```bash
curl -X POST https://your-domain.com/api/upload-xml \
  -H "Content-Type: application/xml" \
  -H "x-api-key: your-tenant-api-key" \
  -H "X-Data-Type: Sales" \
  -H "X-Dashboard-Title: Q4 Analytics" \
  -d '<resultset columns="2" rows="2">
        <row number="1">
          <date>2024-01-01</date>
          <value>1000</value>
        </row>
        <row number="2">
          <date>2024-02-01</date>
          <value>1500</value>
        </row>
      </resultset>'
```

#### 🚀 MOCA Integration Example

For warehouse management systems using MOCA, here's how to push data to Smart Dashboard:

```moca
{publish data where date = '8/14' and sales= 25001
&
publish data where date = '8/15' and sales =28500
&
publish data where date = '8/16' and sales =37500
&
publish data where date = '8/17' and sales =42000
&
publish data where date = '8/18' and sales =90000
}
>> rs
|
convert result set to xml
|
get xml
|
publish data where x = @mxml_xml
|
{
  do http request
  where url = 'https://your-domain.com/api/upload-xml'
  and method = 'post'
  and header = 'X-Tenant-Id:<tenant-id>&X-Data-Type:<data-type>&x-api-key:<api-key>&X-Dashboard-Id:<dashboard-id>'
  and body = @x
}
```

#### 🔑 Required Field Sources

| Field            | Where to Find It          | Description                                                     |
| ---------------- | ------------------------- | --------------------------------------------------------------- |
| **Tenant ID**    | Tenants table in database | Your organization's unique identifier                           |
| **API Key**      | Tenants table in database | Secure authentication token for your tenant                     |
| **Dashboard ID** | Data management screen    | Click the copy button next to any dashboard                     |
| **Data Type**    | You define this           | Custom name for your chart/dataset (e.g., "Sales", "Inventory") |

**Response:**

```json
{
  "success": true,
  "message": "Data processed and saved for Sales",
  "recordCount": 5,
  "dashboardId": "uuid-of-dashboard"
}
```

### 🔐 Internal APIs (Development & Management)

The following APIs are for internal dashboard management and require JWT authentication:

```javascript
// Include in request headers for internal APIs
Authorization: Bearer <supabase_jwt_token>
X-Tenant-ID: <tenant_id>
```

| Method     | Endpoint                     | Description                     | Usage        |
| ---------- | ---------------------------- | ------------------------------- | ------------ |
| `GET`      | `/api/public/tenants`        | List accessible tenants         | Internal     |
| `GET`      | `/api/public/shared/[token]` | Access shared dashboard         | Public       |
| `GET`      | `/api/internal/dashboards`   | List tenant dashboards          | Internal     |
| `POST`     | `/api/internal/dashboards`   | Create new dashboard            | Internal     |
| **`POST`** | **`/api/upload-xml`**        | **Upload and process XML data** | **External** |

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15.5.2, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI components
- **Backend**: Next.js API routes, Supabase
- **Database**: PostgreSQL
- **Auth**: Supabase Auth with JWT tokens
- **Deployment**: Docker, Vercel ready

### Security Model

- **Multi-tenant isolation** - Complete data segregation per tenant
- **JWT authentication** - Secure token-based auth with Supabase
- **Row-Level Security** - Database-level access controls
- **API rate limiting** - Prevents abuse (20/min public, 50/min internal)
- **Input validation** - XML sanitization and size limits
- **CORS protection** - Domain-restricted cross-origin access

## 🛠️ Development Workflow

### Project Structure

```
smart-dashboard/
├── app/                    # Next.js 15 App Router
│   ├── [tenantId]/        # Tenant-scoped pages
│   └── api/               # API routes
├── components/            # Reusable React components
├── lib/                   # Utilities and business logic
├── scripts/               # Database migration scripts
└── docker-compose.yml     # Development environment
```

### Adding Features

1. **Database changes** → Add migration script in `/scripts/`
2. **API endpoints** → Create route in `/app/api/` with auth
3. **UI components** → Build in `/components/` with TypeScript
4. **Pages** → Add tenant-scoped routes in `/app/[tenantId]/`

### Development Commands

```bash
# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript checks

# Docker
npm run docker:dev         # Development with hot reload
npm run docker:prod        # Production build and run
npm run docker:clean       # Clean up Docker resources
```

## 🚀 Deployment

Smart Dashboard is **Docker-ready** and can be deployed anywhere Docker containers are supported. This provides maximum flexibility for your infrastructure needs.

### 🐳 Docker Deployment (Recommended)

**Local/Self-hosted:**

```bash
# Build and run production image
npm run docker:prod:build
npm run docker:prod

# Or use docker-compose directly
docker compose -f docker-compose.prod.yml up -d
```

**Cloud Deployment Options:**

| Platform         | Service                     | Commands                  |
| ---------------- | --------------------------- | ------------------------- |
| **AWS**          | ECS, EKS, Elastic Beanstalk | `docker push` to ECR      |
| **Azure**        | Container Instances, AKS    | `az acr build` and deploy |
| **Google Cloud** | Cloud Run, GKE              | `gcloud builds submit`    |
| **DigitalOcean** | App Platform, Droplets      | Docker-based deployments  |
| **Railway**      | Native Docker support       | Connect GitHub repo       |
| **Render**       | Docker deployments          | Dockerfile auto-detection |

### Alternative Deployment Options

**Vercel:**

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on every push to main

**Traditional VPS/Server:**

```bash
# Clone and build on server
git clone <repo> && cd smart-dashboard
npm install && npm run build
npm start
```

## 🔧 Troubleshooting

<details>
<summary><strong>Authentication Issues</strong></summary>

- ✅ Check Supabase credentials in `.env.local`
- ✅ Verify JWT token hasn't expired
- ✅ Ensure user has tenant access in `user_tenants` table
</details>

<details>
<summary><strong>File Upload Problems</strong></summary>

- ✅ Validate XML format and size (50MB limit)
- ✅ Check tenant API key is correct
- ✅ Verify dashboard IDs exist for your tenant
- ✅ Ensure CORS configuration allows your domain
</details>

<details>
<summary><strong>Docker Issues</strong></summary>

```bash
# Container won't start
docker --version                  # Check Docker is running
npm run docker:rebuild            # Clean rebuild

# Hot reload not working
export WATCHPACK_POLLING=true     # Enable file watching
npm run docker:dev

# Port conflicts
npm run docker:dev:down           # Stop containers
lsof -i :3000                     # Check what's using port 3000
```

</details>

## 📖 Documentation

- **API Reference**: Check `/app/api/` directory for endpoint documentation
- **Database Schema**: See `/scripts/` for table definitions
- **Component Library**: Browse `/components/` for UI components
- **Architecture Details**: Review `/CLAUDE.md` files in each directory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit: `git commit -m 'Add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Built with ❤️ for modern data visualization</strong>
</div>