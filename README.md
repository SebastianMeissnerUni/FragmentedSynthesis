# FragmentedSynthesis

FragmentedSynthesis is a modular web application consisting of:

- Frontend: Vue.js + Vue Flow
- Backend: Node.js + Express
- Database: SQLite
- Containerization: Docker (Backend + Frontend + Compose)

## Project Setup
## Local Development (without Docker)

### Start the Backend
```sh
cd backend
npm install
npm run dev
```
### Start the Frontend
```sh
cd frontend
npm install
npm run dev
```

## Development & Production via Docker
The project uses three Docker files:

Dockerfile.backend – builds the Node.js backend

Dockerfile.frontend – builds the Vue.js frontend

docker-compose.yml – orchestrates both services

### Start the project
```sh
docker compose up --build
```
After the first build:
```sh
docker compose up
```
## Recommended Browser Setup
It's best to use a **Chromium-based** browser (Chrome, Edge, Brave, etc.). Firefox should also work, and Safari mostly works, but has some undocumented bugs.


## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).


