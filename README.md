# Time Tracking & Invoicing SaaS Platform

## Project Overview

A modern, efficient time tracking and invoicing web application designed for seamless client management and financial tracking.

## Step-by-Step Installation Guide for Linux

### Prerequisites

- Node.js (v18.x or later)
  ```bash
  # Install Node.js using NVM (recommended)
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # Reload shell configuration
  source ~/.bashrc  # or ~/.zshrc if using zsh
  # Install and use Node.js LTS
  nvm install --lts
  nvm use --lts
  ```

- npm (comes with Node.js) or Bun
  ```bash
  # To install Bun (optional alternative to npm)
  curl -fsSL https://bun.sh/install | bash
  ```

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

The application uses Supabase for backend services. The default configuration connects to a Supabase cloud instance.

If you need to connect to a different Supabase cloud project:

1. Navigate to your Supabase project dashboard
2. Go to Project Settings > API
3. Copy the Project URL, Anon Key, and Project Reference ID
4. Open `src/config/environment.ts`
5. Update the values in the configuration object

```typescript
export const environment: EnvironmentConfig = {
  supabase: {
    url: 'your-project-url',
    anonKey: 'your-anon-key',
    projectRef: 'your-project-ref',
  },
  fortnox: {
    authUrl: 'https://apps.fortnox.se/oauth-v1/auth',
    apiUrl: 'https://api.fortnox.se/3',
    redirectBaseUrl: '/settings?tab=fortnox',
  },
  storage: {
    avatarBucket: 'avatars',
    logosBucket: 'logos',
    newsBucket: 'news',
  },
  features: {
    enableEdgeFunctions: true,
  }
};
```

### 4. Development Server

Start the development server:

```bash
# Using npm
npm run dev

# Or using Bun
bun dev
```

The application will be available at `http://localhost:8080`

You can view it in your browser by visiting:
- Local machine: http://localhost:8080
- On your network: http://your-ip-address:8080 (find your IP with `ip addr show` or `hostname -I`)

### 5. Production Build

Create a production build:

```bash
# Using npm
npm run build

# Or using Bun
bun run build
```

This will generate optimized files in the `dist` directory.

### 6. Serving the Production Build

#### Using a simple HTTP server

```bash
# Install serve globally
npm install -g serve

# Serve the production build
serve -s dist -l 8080
```

The application will be available at `http://localhost:8080`

#### Using NGINX (for production deployment)

1. Install NGINX:
```bash
sudo apt update
sudo apt install nginx
```

2. Configure NGINX:
```bash
sudo nano /etc/nginx/sites-available/time-tracker
```

3. Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain

    root /path/to/your/project/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

4. Enable the site and restart NGINX:
```bash
sudo ln -s /etc/nginx/sites-available/time-tracker /etc/nginx/sites-enabled/
sudo nginx -t  # Test the configuration
sudo systemctl restart nginx
```

#### Using PM2 (for persistent process management)

1. Install PM2:
```bash
npm install -g pm2
```

2. Create a serve.js file:
```bash
echo 'const handler = require("serve-handler");
const http = require("http");
const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: "dist"
  });
})
server.listen(8080);' > serve.js
```

3. Start with PM2:
```bash
pm2 start serve.js --name "time-tracker"
pm2 save
```

### 7. Fortnox Integration

To enable Fortnox integration:

1. Register for a Fortnox Developer account
2. Create a new application
3. Obtain Client ID and Client Secret
4. Configure the integration in the application settings

## Troubleshooting

- **Port already in use**: If port 8080 is already in use, change it in `vite.config.ts`
- **Node.js version**: Ensure you're using Node.js 16.x or later
- **Dependency issues**: Try removing `node_modules` and reinstalling dependencies
- **Supabase connection**: Verify your Supabase credentials are correct
- **Linux permissions**: Ensure your user has proper permissions for the project directory

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

[Your License Here]
