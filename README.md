# Smart Dashboard - Multi-Tenant Data Visualization Platform


## Overview

Smart Dashboard is a comprehensive multi-tenant dashboard and visualization application designed for enterprise data analytics. The platform specializes in processing XML data formats and automatically generating interactive charts and visualizations based on uploaded datasets. 

**Key Capabilities:**
- **Data Processing**: Converts various datasets into structured JSON format for visualization
- **Dynamic Chart Generation**: Automatically creates charts and graphs based on data structure and content
- **Dataset Management**: Supports dataset replacement functionality - when a dataset already exists in a dashboard, new uploads replace the existing data seamlessly
- **Enterprise Integration**: Designed for tools like Moca Client to set up automated jobs that push data to the visualization engine
- **Multi-Tenant Architecture**: Complete tenant isolation with secure data segregation and user access controls
- **Public Dashboard Sharing**: Secure token-based sharing of dashboards with external users
- **TV Mode**: Full-screen slideshow mode for dashboard presentations and public displays

The platform enables organizations to transform raw data into meaningful visual insights through an intuitive dashboard interface, making it ideal for business intelligence, reporting, and data monitoring workflows.

## Features

- 🏢 **Multi-Tenant Architecture** - Isolated data and dashboards per tenant
- 🔐 **Secure Authentication** - Supabase-powered user authentication with JWT tokens
- 📊 **Dynamic Dashboards** - Create and manage custom data visualization dashboards
- 🔄 **XML to JSON Conversion** - Automated data transformation with validation
- 📈 **Automatic Chart Generation** - Creates visualizations based on data structure
- 🔄 **Dataset Replacement** - Seamless data updates for existing datasets
- 🛡️ **Enterprise Security** - Row-level security, tenant isolation, and API authentication
- 📱 **Responsive Design** - Modern UI with dark/light theme support
- 🚀 **Real-time Updates** - Live data synchronization across components
- 🔗 **Integration Ready** - Built for automated data pipeline integration
- 🔗 **Public Dashboard Sharing** - Secure token-based sharing of dashboards with external users
- 📺 **TV Mode** - Full-screen slideshow mode for dashboard presentations and public displays

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account and project
- Vercel account (for deployment)

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd smart-dashboard
npm install
\`\`\`

### 2. Environment Setup

Create a `.env.local` file with the following variables:

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

### 3. Database Setup

Run the database migration scripts in order:

\`\`\`bash
# Execute these SQL scripts in your Supabase SQL editor or via CLI
scripts/001_create_tenants_table.sql
scripts/002_create_users_table.sql
scripts/003_create_dashboards_table.sql
scripts/004_create_data_files_table.sql
scripts/005_create_settings_table.sql
scripts/006_create_user_profiles_table.sql
scripts/007_create_user_tenants_table.sql
scripts/009_add_api_key_to_tenants.sql
scripts/010_create_public_dashboard_shares.sql
scripts/011_add_public_sharing_setting.sql
scripts/012_fix_data_files_unique_constraint.sql
\`\`\`

Visit `http://localhost:3000` to access the application.

## Architecture

### Database Schema

The platform uses the following core tables:

- **tenants** - Tenant organizations with domain-based assignment and unique API keys
- **users** - User authentication and profile data
- **user_tenants** - Many-to-many relationship for tenant access control
- **dashboards** - Dashboard configurations per tenant
- **data_files** - Uploaded XML files and converted JSON data
- **settings** - Tenant-specific configuration settings
- **user_profiles** - Extended user profile information
- **public_dashboard_shares** - Records for public dashboard sharing tokens

### Authentication Flow

1. Users sign up/login via Supabase Auth
2. Domain-based tenant assignment on signup
3. JWT token validation on all API requests
4. Row-level security enforces tenant isolation
5. User-tenant permissions control dashboard access

### Security Model

- **JWT Token Validation** - All APIs require valid Supabase tokens
- **Tenant Isolation** - Users only access their assigned tenants
- **Row-Level Security** - Database-level access control
- **API Authentication** - Comprehensive token validation middleware
- **Input Validation** - XML sanitization and data validation
- **CORS Protection** - Restricted cross-origin access with domain whitelisting
- **Rate Limiting** - Request throttling to prevent abuse (20/min public, 50/min internal)
- **Input Size Limits** - Request size restrictions to prevent DoS attacks

## API Documentation

### Authentication

All API endpoints (except file upload) require authentication via JWT tokens:

\`\`\`javascript
// Include in request headers
Authorization: Bearer <supabase_jwt_token>
X-Tenant-ID: <tenant_id>
\`\`\`

### Public APIs

#### GET /api/public/tenants
Fetch tenants accessible to authenticated user.

**Response:**
\`\`\`json
{
  "tenants": [
    {
      "id": "uuid",
      "name": "Tenant Name",
      "domain": "example.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
\`\`\`

#### GET /api/public/shared/[token]
Access shared dashboard data via public token.

**Parameters:**
- `token` - Public share token for the dashboard

**Response:**
\`\`\`json
{
  "dashboard": {
    "id": "uuid",
    "title": "Dashboard Title",
    "description": "Dashboard description"
  },
  "tenant": {
    "name": "Tenant Name"
  }
}
\`\`\`

#### GET /api/public/shared/[token]/data-files
Fetch data files for a publicly shared dashboard.

**Parameters:**
- `token` - Public share token for the dashboard

**Response:**
\`\`\`json
{
  "dataFiles": [
    {
      "id": "uuid",
      "data_type": "Sales",
      "json_data": {...},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
\`\`\`

### Internal APIs

#### Dashboard Management
- `GET /api/internal/dashboards` - List tenant dashboards
- `POST /api/internal/dashboards` - Create new dashboard
- `PUT /api/internal/dashboards/[id]` - Update dashboard
- `DELETE /api/internal/dashboards/[id]` - Delete dashboard
- `PATCH /api/internal/dashboards/reorder` - Reorder dashboards

#### Data File Management
- `GET /api/internal/data-files` - List data files with filtering
- `POST /api/internal/data-files` - Upload and process XML files
- `PUT /api/internal/data-files/[id]` - Update data file
- `DELETE /api/internal/data-files/[id]` - Delete data file
- `PATCH /api/internal/data-files/reorder` - Reorder files

#### Settings Management
- `GET /api/internal/settings` - Fetch tenant settings
- `POST /api/internal/settings` - Create setting
- `PATCH /api/internal/settings/[key]` - Update setting
- `DELETE /api/internal/settings/[key]` - Delete setting

### File Upload API

#### POST /api/upload-xml
Upload XML files for processing and visualization.

**Authentication Required:** Yes - via tenant-specific API key authentication

**Authentication Methods:**
- **Method 1:** `x-api-key: <tenant-api-key>` header
- **Method 2:** `Authorization: Bearer <tenant-api-key>` header

**Important:** Each tenant has its own unique API key. The API key automatically determines which tenant the data belongs to, providing secure tenant isolation.

**Dashboard Handling:**
The API supports two modes for dashboard management:

**For Existing Dashboards:**
- Use the `X-Dashboard-Id` header with the ID of an existing dashboard
- Data will be added to the specified dashboard, replacing any existing dataset with the same data type

**For New Dashboard Creation:**
- Use the `X-Dashboard-Title` header with a title for the new dashboard
- The system will automatically create a new dashboard with the provided title

**Required Headers:**
\`\`\`bash
x-api-key: <tenant-api-key>                  # Tenant-specific authentication (required)
X-Data-Type: <data-category>                 # Data categorization (required)
X-Dashboard-Id: <dashboard-id>               # For existing dashboard (either/or)
X-Dashboard-Title: <dashboard-title>         # For new dashboard (either/or)
\`\`\`

**Request Example:**
\`\`\`bash
# Using existing dashboard
curl -X POST http://localhost:3000/api/upload-xml \
  -H "Content-Type: application/xml" \
  -H "x-api-key: tenant_550e8400-e29b-41d4-a716-446655440000_abc123def456" \
  -H "X-Data-Type: Sales" \
  -H "X-Dashboard-Id: existing-dashboard-id" \
  -d '<resultset columns="2" rows="2">
        <row number="1">
          <date>8/11/2023</date>
          <value>2</value>
        </row>
        <row number="2">
          <date>8/11/2024</date>
          <value>3</value>
        </row>
      </resultset>'

# Creating new dashboard
curl -X POST http://localhost:3000/api/upload-xml \
  -H "Content-Type: application/xml" \
  -H "x-api-key: tenant_550e8400-e29b-41d4-a716-446655440000_abc123def456" \
  -H "X-Data-Type: Sales" \
  -H "X-Dashboard-Title: Q4 Sales Analytics" \
  -d '<resultset>...</resultset>'
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "message": "Data processed and saved for Sales",
  "recordCount": 2,
  "fileName": "Sales.json",
  "dashboardId": "uuid-of-dashboard"
}
\`\`\`

**Key Features:**
- **Tenant-Specific API Keys**: Each tenant has a unique API key for secure data isolation
- **Automatic Tenant Detection**: API key automatically determines the target tenant
- **Dataset Replacement**: If a dataset with the same data type already exists in the dashboard, it will be replaced with the new data
- **Automatic Chart Generation**: Charts are automatically created based on the XML data structure
- **Validation**: XML data is validated and sanitized before processing

## Development Workflow

### Adding New Features

1. **Database Changes** - Create migration scripts in `/scripts/`
2. **API Endpoints** - Add routes in `/app/api/` with authentication
3. **Components** - Create reusable components in `/components/`
4. **Pages** - Add tenant-scoped pages in `/app/[tenantId]/`

### Security Checklist

- ✅ JWT token validation on all protected APIs
- ✅ Tenant access verification via user_tenants table
- ✅ Row-level security policies in Supabase
- ✅ Input sanitization and validation
- ✅ CORS configuration with domain restrictions
- ✅ Rate limiting on all endpoints
- ✅ Input size limits to prevent DoS attacks
- ✅ Environment variable protection
- ✅ Public share token validation
- ✅ Secure public dashboard access

## Deployment

### Vercel Deployment

1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on git push

### Environment Variables (Production)

Ensure all environment variables are configured in your deployment platform:

- Supabase credentials
- Redirect URLs for production domain

**Note:** The API_SECRET_KEY environment variable has been removed. Authentication now uses tenant-specific API keys stored in the database.

## Troubleshooting

### Common Issues

**Authentication Errors:**
- Verify Supabase credentials in environment variables
- Check JWT token expiration and refresh logic
- Ensure user has tenant access in user_tenants table

**Database Connection:**
- Confirm Supabase service role key permissions
- Verify RLS policies are properly configured
- Check database migration script execution

**File Upload Issues:**
- Validate XML file format and size limits (50MB max for upload-xml, 10MB for others)
- Ensure tenant API key is valid and belongs to the correct tenant
- Check dashboard IDs are valid for the authenticated tenant
- Check CORS configuration for cross-origin requests
- Verify request size doesn't exceed configured limits

**Public Sharing Issues:**
- Ensure public share tokens are valid and not expired
- Check that shared dashboards have proper data access
- Verify TV mode functionality with different refresh intervals
- Confirm public URLs are accessible without authentication

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## License

This project is built with [v0.app](https://v0.app) and deployed on Vercel.

## Support

For issues and support:
- Check the troubleshooting section above
- Review API documentation for proper usage
- Verify environment configuration
- Contact development team for tenant access issues
