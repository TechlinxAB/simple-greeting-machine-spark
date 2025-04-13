
# Time Tracking & Invoicing SaaS Platform

## Project Overview

A modern, efficient time tracking and invoicing web application designed for seamless client management and financial tracking.

## Prerequisites

- Node.js (LTS version recommended)
- npm or Bun

## Technology Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Supabase (Cloud)
- shadcn-ui

## Complete Installation Guide

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using Bun
bun install
```

### 3. Supabase Configuration

1. Create a Supabase project at [Supabase](https://supabase.com)
2. Navigate to Project Settings > API
3. Update `src/config/environment.ts` with your project's:
   - Project URL
   - Anon Key
   - Project Reference ID

### 4. Development Server

Start the development server:

```bash
# Using npm
npm run dev

# Or using Bun
bun dev
```

The application will be available at `http://localhost:8080`

## Production Build

Create a production build:

```bash
# Using npm
npm run build

# Or using Bun
bun run build
```

## Deployment

Deploy your application using:
- Lovable's built-in deployment
- Vercel
- Netlify
- Your preferred hosting platform

## Fortnox Integration

1. Register for a Fortnox Developer account
2. Create a new application
3. Obtain Client ID and Client Secret
4. Configure integration in application settings

## Troubleshooting

- Ensure all environment variables are correctly set
- Check browser console for any errors
- Verify Supabase connection settings

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

[Your License Here]
