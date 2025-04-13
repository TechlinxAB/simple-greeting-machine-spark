
# Time Tracking & Invoicing SaaS Platform

## Project info

**URL**: https://lovable.dev/projects/5a7b22d3-f455-4d7b-888a-7f87ae8dba3f

## Complete Installation Guide for Ubuntu 22.04

This guide will walk you through the process of setting up and deploying the Time Tracking & Invoicing SaaS Platform on a fresh Ubuntu 22.04 installation.

### 1. System Prerequisites

Update your system and install required dependencies:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js dependencies
sudo apt install -y curl git build-essential

# Install Node.js using NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js LTS version
nvm install --lts
nvm use --lts

# Verify installation
node --version
npm --version
```

### 2. Clone the Repository

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd <YOUR_PROJECT_NAME>
```

### 3. Install Project Dependencies

```bash
# Install dependencies
npm install
```

### 4. Supabase Setup Options

#### Option A: Use Hosted Supabase (Recommended for Getting Started)

1. Create an account at [Supabase](https://supabase.com) if you don't have one
2. Create a new project
3. Run the SQL scripts provided in the project's SQL files to set up tables and RLS policies
4. Get your Supabase URL and anon key from your Supabase project settings

#### Option B: Self-host Supabase (For Production)

1. Install Docker and Docker Compose:
```bash
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
# Log out and log back in for group changes to take effect
```

2. Follow the [Supabase self-hosting guide](https://supabase.com/docs/guides/self-hosting):
```bash
# Clone Supabase repository
git clone https://github.com/supabase/supabase
cd supabase/docker

# Start Supabase
docker-compose up -d
```

3. Access your local Supabase instance at `http://localhost:3000`
4. Run the SQL scripts provided in the project's SQL files to set up tables and RLS policies

### 5. Configure the Application

Update the environment configuration to point to your Supabase instance:

```bash
# Open the environment configuration file
nano src/config/environment.ts
```

For hosted Supabase, use the values from your Supabase project settings.
For self-hosted Supabase, modify the configuration to use your local instance.

### 6. Development Mode

Start the application in development mode:

```bash
npm run dev
```

This will launch the application at http://localhost:8080 with hot reloading for development.

### 7. Production Deployment

Build the application for production:

```bash
# Build the application
npm run build

# The optimized files are now in the dist/ directory
```

#### Option A: Serve with Nginx (Recommended for Production)

1. Install Nginx:
```bash
sudo apt install -y nginx
```

2. Configure Nginx:
```bash
sudo nano /etc/nginx/sites-available/timetracking
```

3. Add the following configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/timetracking;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

4. Enable the site and deploy the build:
```bash
sudo ln -s /etc/nginx/sites-available/timetracking /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site if needed
sudo mkdir -p /var/www/timetracking
sudo cp -r dist/* /var/www/timetracking/
sudo systemctl restart nginx
```

5. Set up SSL with Certbot (optional but recommended):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Option B: Simple HTTP Server (For Testing)

```bash
# Install a simple HTTP server
npm install -g serve

# Serve the production build
serve -s dist
```

### 8. Updating the Application

To update the application:

```bash
# Pull the latest changes
git pull

# Install any new dependencies
npm install

# Rebuild the application
npm run build

# If using Nginx, update the deployed files
sudo cp -r dist/* /var/www/timetracking/
```

## Additional Configuration

### Setting Up Fortnox Integration

1. Register for a Fortnox Developer account at [Fortnox Developer Portal](https://developer.fortnox.se/)
2. Create a new application and get your Client ID and Client Secret
3. Set up your redirect URLs in the Fortnox Developer Portal
4. Configure the Fortnox integration in the application settings

## Troubleshooting

If you encounter any issues:

1. Check the console logs in your browser for frontend errors
2. Check Supabase logs for backend errors
3. Ensure all SQL migrations have been applied correctly
4. Verify that environment configuration points to the correct Supabase instance
5. For authentication issues, verify Supabase authentication settings

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/5a7b22d3-f455-4d7b-888a-7f87ae8dba3f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/5a7b22d3-f455-4d7b-888a-7f87ae8dba3f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
