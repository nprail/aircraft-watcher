# Deploying to Synology NAS with Container Manager

This guide covers two methods for running aircraft-watcher on a Synology NAS using **Container Manager** (DSM 7.2+).

- **Method A** — Compose Project (recommended): upload a `docker-compose.yml` and let Container Manager manage the stack.
- **Method B** — Manual container: configure everything through the Container Manager GUI without any files.

---

## Prerequisites

- Synology DSM 7.2 or later with **Container Manager** installed (Package Center → Container Manager).
- Your NAS model supports Docker (most x86-64 models and newer ARM64 models do).
- A shared folder where persistent data will be stored — this guide uses `/docker/aircraft-watcher/data`. Create it in **File Station** if it does not exist.

---

## Method A — Compose Project (Recommended)

### 1. Create the data folder

In **File Station**, navigate to the `docker` shared folder (create it if needed) and create:

```
docker/
  aircraft-watcher/
    data/
```

### 2. Create the compose file

Create a file named `docker-compose.yml` inside `docker/aircraft-watcher/` with the following content:

```yaml
services:
  aircraft-watcher:
    image: ghcr.io/nprail/aircraft-watcher:main
    container_name: aircraft-watcher
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATA_FOLDER=/app/data
    volumes:
      - /volume1/docker/aircraft-watcher/data:/app/data
```

> **Note:** Replace `/volume1` with the correct volume name for your NAS if different (e.g. `/volume2`). You can check in **Storage Manager**.

If you want to change the web UI port, update the left side of the port mapping (e.g. `"8080:3000"` to use port 8080 on your NAS).

### 3. Create the project in Container Manager

1. Open **Container Manager** → **Project** → **Create**.
2. Set **Project Name** to `aircraft-watcher`.
3. Under **Source**, choose **Upload compose file** and select the `docker-compose.yml` you created, **or** choose **Set path** and point it to `docker/aircraft-watcher/`.
4. Click **Next**, review the summary, and click **Done**.

Container Manager will pull the image and start the container automatically.

---

## Method B — Manual Container Setup

### 1. Create the data folder

In **File Station**, create the folder `docker/aircraft-watcher/data`.

### 2. Download the image

1. Open **Container Manager** → **Registry**.
2. Search for `ghcr.io/nprail/aircraft-watcher`.
3. If the GHCR registry is not listed, go to **Registry** → **Settings** → **Add** and enter `https://ghcr.io` as a custom registry, then search again.
4. Select the `main` tag and click **Download**.

Alternatively, pull from **Container Manager** → **Image** → **Add** → **Add from URL** and enter:

```
ghcr.io/nprail/aircraft-watcher:main
```

### 3. Create the container

1. Open **Container Manager** → **Container** → **Create**.
2. Select the `ghcr.io/nprail/aircraft-watcher:main` image and click **Next**.
3. Set **Container Name** to `aircraft-watcher`.
4. Enable **Auto-restart**.

#### Port settings

| Local Port | Container Port | Protocol |
|-----------|---------------|----------|
| 3000      | 3000          | TCP      |

Change the local port if 3000 is already in use on your NAS.

#### Volume settings

| Host Folder | Container Path | Access |
|-------------|---------------|--------|
| `docker/aircraft-watcher/data` | `/app/data` | Read/Write |

Use the **File/Folder** tab to browse to `docker/aircraft-watcher/data`.

#### Environment variables

| Variable             | Value                          |
|---------------------|-------------------------------|
| `NODE_ENV`          | `production`                  |
| `DATA_FOLDER`       | `/app/data`                   |

5. Click **Next**, review the summary, and click **Done**.

---

## First-Run Configuration

On first start, `data/settings.json` is created automatically with built-in defaults. Open the web UI to configure the service:

```
http://<NAS-IP>:3000
```

The most important settings to configure:

| Setting | Description |
|---------|-------------|
| **ADS-B Feed URL** | URL of your [tar1090](https://github.com/wiedehopf/tar1090) instance (e.g. `http://192.168.1.x:8080`) |
| **Webhook URLs** | Where to send alerts (e.g. a [ntfy](https://ntfy.sh) topic or Discord webhook) |
| **Location** | Your latitude/longitude so alerts include a distance reading |
| **Watch Callsigns** | Specific callsigns you always want alerts for |

All changes take effect on the next poll cycle — no restart required.

---

## Updating

### Compose Project

In **Container Manager** → **Project**, select `aircraft-watcher` → **Action** → **Build** (or **Stop** then **Build**).  
Container Manager will pull the latest `main` image and recreate the container with the same compose configuration.

### Manual Container

1. **Container Manager** → **Container** → stop and delete the `aircraft-watcher` container (the data volume is preserved).
2. **Container Manager** → **Image** → delete the old `ghcr.io/nprail/aircraft-watcher:main` image.
3. Re-download the image (Registry or Add from URL as above).
4. Recreate the container using the same settings.

---

## Troubleshooting

### View logs

**Container Manager** → **Container** → select `aircraft-watcher` → **Details** → **Log** tab.

Logs are structured JSON. Each line contains `level`, `msg`, and a timestamp.

### Container exits immediately

Check the log for startup errors. The most common cause is a misconfigured `DATA_FOLDER` path — verify the host folder is mounted correctly and the `data/` directory exists and is writable.

### Cannot reach the web UI

- Confirm the container is running in **Container Manager**.
- Check that port 3000 (or your custom port) is not blocked by the DSM firewall (**Control Panel** → **Security** → **Firewall**).
- If running another service on port 3000, change the host port mapping.

### Feed not polling

Ensure the `tar1090Url` in the web UI is reachable from the NAS. If your tar1090 instance runs on another machine, use its local IP address rather than `localhost`.
