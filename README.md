# Chess Project

## Useful redeployment script

```{bash}
cd ~/chess-solver
git pull 

cd backend 

docker build -t chess-backend .

docker stop chess-backend
docker rm chess-backend

docker run -d \
    --name chess-backend \
    --restart unless-stopped \ 
    -p 8000:8000 \
    chess-backend
```

## Architecture Overview

```text
Frontend:
https://chess.niravpandey.com hosted on Vercel

Backend:
http://api.chess.niravpandey.com, Runs AWS EC2 with Nginx reverse proxy, a Docker container and a FastAPI application
```

---

# Frontend Deployment (Vercel)

## Create Next.js Frontend

```bash
pnpm create next-app@latest frontend
```

## Local Development

```bash
cd frontend
pnpm install
pnpm dev
```

## Build Locally

```bash
pnpm run build
```

## Deploy to Vercel

Very important step

---

# Cloudflare DNS Setup

## Frontend DNS

```text
Type: CNAME
Name: chess
Target: cname.vercel-dns.com
```

---

## Backend DNS

```text
Type: A
Name: api.chess
Content: <EC2_PUBLIC_IP>
```

```text
api.chess.niravpandey.com
```

---

# EC2 Setup

## Launch EC2 Instance

```text
AMI: Amazon Linux 2023
Instance Type: t2.micro
```

## SSH Into Instance

```bash
ssh -i ~/Downloads/Chess.pem ec2-user@<EC2_PUBLIC_IP>
```

---

# Install Dependencies on EC2

```bash
sudo dnf update -y
sudo dnf install -y git python3 python3-pip docker nginx
```

---

# Enable Docker

```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```

Log out and SSH back in afterward.

---

# Clone Repository on EC2

```bash
git clone https://github.com/niravpandey/chess-solver.git
cd chess-solver/backend
```

---

# Backend Setup

## requirements.txt

```txt
fastapi
uvicorn
```

# Docker Setup

---

# Build Docker Image

```bash
cd ~/chess-solver/backend

docker build -t chess-backend .
```

---

# Run Docker Container

```bash
docker run -d \
  --name chess-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  chess-backend
```

## Check Running Containers

```bash
docker ps
```

## Check Logs

```bash
docker logs chess-backend
```

---

# Security Group Rules

## Required Inbound Rules

### SSH

```text
Type: SSH
Port: 22
Source: Your IP
```

### HTTP

```text
Type: HTTP
Port: 80
Source: 0.0.0.0/0
```

### Temporary FastAPI Testing

```text
Type: Custom TCP
Port: 8000
Source: 0.0.0.0/0
```

Later, port 8000 should be removed publicly once Nginx is fully handling traffic.

---

# Nginx Setup

## Create Config

```bash
sudo nano /etc/nginx/conf.d/chess-api.conf
```

## Nginx Config

```nginx
server {
    listen 80;
    server_name api.chess.niravpandey.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Test Nginx

```bash
sudo nginx -t
```

## Restart Nginx

```bash
sudo systemctl restart nginx
```

## Enable Nginx on Boot

```bash
sudo systemctl enable nginx
```

---

# Deployment Workflow

## Local Machine

```bash
git add .
git commit -m "Update backend"
git push
```

## EC2

```bash
cd ~/chess-solver

git pull

cd backend

docker build -t chess-backend .

docker stop chess-backend

docker rm chess-backend

docker run -d \
  --name chess-backend \
  --restart unless-stopped \
  -p 8000:8000 \
  chess-backend
```

---

# Current Stack

```text
Frontend:
- Next.js
- Vercel

Backend:
- FastAPI
- Docker
- AWS EC2
- Nginx

Infrastructure:
- Cloudflare DNS
- Linux
```

---

# Future Improvements

## HTTPS

Add SSL using:

* Certbot
* Cloudflare proxying

Goal:

```text
https://api.chess.niravpandey.com
```

---

## Possible Additions

* PostgreSQL
* WebSockets
* Multiplayer rooms
* Authentication
* Docker Compose
* GitHub Actions CI/CD
* Redis
* Match persistence
