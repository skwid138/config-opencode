# Legacy V1 Remote OpenCode Web UI Access (Tailscale)

Archived instructions for a V1-era workflow to use OpenCode from another tailnet device, with the Mac (`Glitch`) as the backend.

> **Legacy V1-only reference.** This document records the old `opencode web` and `opencode attach` (`openattach`) workflow. Those commands were already unsupported by native V2.1.4 before cutover and remain unsupported and unrepaired on native V2.3.0. Do not use this as a current setup guide. No V2 remote-access replacement is documented; helper repairs are deferred.

> **Historical primary use case:** drive opencode sessions from an iPhone over cellular while away from the desk (e.g. walking the dog) without exposing the Mac to the public internet.

---

## Historical V1 daily-use commands

The commands below are retained as a historical example only; they are not supported with the current native V2 runtime.

```sh
# On the Mac, when you want remote access:
openweb

# In other local terminals (so TUI sessions share the same backend as the web UI):
openattach
```

Then on the phone (Tailscale toggle ON):

> **<https://glitch.taila2ef4f.ts.net>**

Username: `opencode`
Password: stored in macOS Keychain — Safari prompts once, save to iCloud Keychain.

To stop: `Ctrl+C` in the terminal where `openweb` is running. The Mac is then free to sleep.

---

## Historical V1 architecture

This diagram describes the archived V1 workflow, not a current V2 deployment.

```
[iPhone Safari]
   |  HTTPS (TLS 1.3, Tailscale-managed cert)
   v
glitch.taila2ef4f.ts.net   (Tailscale Serve — tailnet-only, NOT public)
   |  encrypted WireGuard tunnel via Tailscale
   v
glitch (Mac), Tailscale tailscaled
   |  HTTP, loopback only (127.0.0.1)
   v
opencode web on 127.0.0.1:4096   (HTTP Basic Auth)
   |
   v
shared SQLite session DB
   ^                ^
   |                |
[web clients]   [openattach TUI clients]   ← all share live state
```

Key design points:

- **opencode binds to `127.0.0.1` only.** It is never reachable on the LAN, only via Tailscale's encrypted overlay.
- **TLS terminates at Tailscale**, using a real `*.ts.net` Let's Encrypt cert. The link from Tailscale's listener to opencode is HTTP loopback — never on the wire.
- **Single backend, multiple clients.** Run `openweb` once. All other clients (phone Safari, local terminals via `openattach`) hit the same opencode server, so sessions and live status are shared. Running plain `opencode` while `openweb` is up creates a *separate* backend that only shares the on-disk SQLite — viable but not coherent for live state. Prefer `openattach`.
- **`caffeinate -is`** wraps opencode so the Mac stays awake (network reachable) while the display can still sleep, then releases the assertion the moment opencode exits.

---

## Historical V1 initial setup (one-time)

If you ever rebuild the Mac, do these in order. Most of this is captured in `~/.project-plans/2026.05.08_opencode-web-ui.md`.

### 1. Install Tailscale (Standalone)

Download the Standalone macOS package from <https://pkgs.tailscale.com/stable/#tap>. **Do NOT use the Mac App Store version** (sandboxed, fewer features) **or Homebrew** (not officially supported by Tailscale for macOS).

After install, sign in. Set the machine name:

```sh
tailscale set --hostname=glitch
```

### 2. Enable MagicDNS, HTTPS Certs, and Serve in the admin console

- DNS settings: <https://login.tailscale.com/admin/dns>
  - Toggle **MagicDNS** on
  - Click **Enable HTTPS** under HTTPS Certificates (acknowledge the Certificate Transparency notice)
- Serve toggle: visit `https://login.tailscale.com/f/serve?node=<your-node-id>` when `tailscale serve` first prompts you, and enable Serve. **Do NOT enable Funnel** unless you specifically want public internet access.

### 3. Generate and store the opencode server password

```sh
PW="$(LC_ALL=C tr -dc 'A-Za-z0-9_-' </dev/urandom | head -c 40)"
security add-generic-password \
  -s 'opencode-server-password' \
  -a "$USER" \
  -w "$PW" \
  -U
unset PW
```

Verify:

```sh
security find-generic-password -s 'opencode-server-password' -a "$USER" -w
```

### 4. Confirm wrapper + aliases are in place

Wrapper: `~/code/scripts/personal/opencode-web.sh` (executable)

Aliases in `~/code/scripts/shell/rc/aliases.zsh`:

```sh
alias openweb='"$HOME/code/scripts/personal/opencode-web.sh"'
alias openattach='opencode attach http://127.0.0.1:4096'
```

### 5. Configure Tailscale Serve to proxy port 4096

```sh
tailscale serve --bg 4096
tailscale serve status
# expected:
#   https://glitch.taila2ef4f.ts.net (tailnet only)
#   |-- / proxy http://127.0.0.1:4096
```

This config persists across reboots. You only ever need to do this once per machine.

### 6. Verify from the phone

1. Install Tailscale on the iPhone (App Store), sign in to the same account.
2. Confirm the Tailscale toggle is ON in iOS Settings or the Tailscale app.
3. Open `https://glitch.taila2ef4f.ts.net` in Safari.
4. Enter `opencode` and the Keychain password. Save to iCloud Keychain so future devices inherit it.

---

## Historical V1 operational details

### Power / sleep

`openweb` wraps opencode in `caffeinate -is`:

- `-i` — prevents idle sleep (CPU stays awake)
- `-s` — prevents system sleep on AC power
- (No `-d` — display CAN sleep, saving power and avoiding burn-in.)

When `openweb` exits, the assertion is released and the Mac is free to sleep per its normal `pmset` configuration. Verify any time:

```sh
pmset -g assertions | grep -i caffeinate
```

**Lid open during use.** Closed-lid operation without an external display is not officially supported by macOS. Walk-the-dog scenario assumes the lid stays open.

### Sessions across clients

All clients connected to the same backend (one `openweb` process) share live session state via SQLite + in-memory run state. Concurrent sessions in the same project work fine — the web UI lists them, you can switch projects with `cmd+O` in the browser.

If you run plain `opencode` (TUI) while `openweb` is also running, they spin up *separate* backends. They share the same on-disk SQLite (so persisted sessions appear after refresh), but live "currently running" status is per-backend. Prefer `openattach` to keep one coherent backend.

### URL parts you control

- **`glitch`** — the Tailscale machine name. Change with `tailscale set --hostname=<new>`.
- **`taila2ef4f.ts.net`** — auto-assigned tailnet DNS name. Changeable once for free in admin console; not worth changing for personal use.
- **`.ts.net`** — fixed.

### Adding more devices (iPad, Android tablet, another Mac)

1. Install Tailscale on the device, sign in to the same account.
2. Open `https://glitch.taila2ef4f.ts.net` in any browser.
3. Enter the saved password (or sync via iCloud Keychain on Apple devices).

No Mac-side changes needed — Serve already exposes the URL to the entire tailnet.

---

## Historical V1 troubleshooting

### Phone says "Cannot connect" / page won't load

1. Check Tailscale on the phone is ON (iOS Settings → VPN, or Tailscale app).
2. On the Mac, confirm `openweb` is running: `lsof -nP -iTCP:4096 -sTCP:LISTEN`.
3. Confirm Tailscale Serve is configured: `tailscale serve status` should show the proxy entry.
4. Ping the Mac from the phone via Tailscale's "Ping" tool, or from another tailnet machine: `tailscale ping glitch`.

### Phone gets a TLS error / cert warning

- Confirm HTTPS Certificates are still enabled in the admin console (DNS settings page). If MagicDNS got disabled, HTTPS certs go with it.
- Cert is auto-renewed by Tailscale; no action needed under normal operation.

### `curl` or `openssl s_client` from the Mac to its OWN tailnet hostname fails with `tlsv1 alert internal error`

**This is a known Tailscale Serve loopback quirk and does NOT affect real client access.** When the Mac that's hosting Tailscale Serve tries to fetch its own `*.ts.net` URL through itself, the local TLS terminator returns an internal-error alert. Test from another tailnet device (phone, another Mac) instead — those work fine.

If you need to verify HTTPS-from-Mac works for some reason, run the request from a different tailnet host, or test the loopback path with HTTP directly:

```sh
# This still works (bypasses Tailscale entirely):
curl -u "opencode:$(security find-generic-password -s 'opencode-server-password' -a "$USER" -w)" \
  http://127.0.0.1:4096/
```

### Basic Auth prompt loops / 401 even with correct password

- Confirm username is exactly `opencode` (default; only changes if `OPENCODE_SERVER_USERNAME` was overridden).
- Re-fetch password to rule out keychain corruption: `security find-generic-password -s 'opencode-server-password' -a "$USER" -w`.
- iCloud Keychain may have cached an old password — clear the saved password for the host in Safari and re-enter.

### `openweb` fails to start with "Address already in use"

Another process holds 4096. Find and stop it:

```sh
lsof -nP -iTCP:4096 -sTCP:LISTEN
# kill the offending PID, or:
pkill -f "caffeinate -is opencode web"
```

### Historical compatibility note: V1 `1.14.40` only

This note records verification on OpenCode `1.14.40` only. It does not establish compatibility with native V2. The documented `web`/`attach` helpers remain unsupported and unrepaired for V2. For historical V1 maintenance, the original diagnostic was:

```sh
opencode web --help
```

Any V1 helper repair remains deferred. Do not use this note as a V2 migration or repair procedure. If a future V1-era maintenance change affects flags or environment variables, the official docs at <https://opencode.ai/docs/web/> and <https://opencode.ai/docs/server/> are authoritative for that legacy workflow.

### Want to confirm the security model

```sh
# 1. opencode binds loopback only
lsof -nP -iTCP:4096 -sTCP:LISTEN
# expected: 127.0.0.1:4096 (NOT 0.0.0.0:4096 or *:4096)

# 2. Tailscale Serve, not Funnel
tailscale serve status
# expected: "(tailnet only)" — never "Funnel" or "(public)"

# 3. caffeinate active only while openweb runs
pmset -g assertions | grep -i caffeinate
```

---

## Historical V1 workflow rollback / disable

Each piece is independently reversible.

### Temporary stop (just for now)

`Ctrl+C` in the `openweb` terminal, or:

```sh
pkill -f "caffeinate -is opencode web"
```

Tailscale Serve config persists, password stays in Keychain. Run `openweb` again to resume.

### Stop Tailscale Serve completely

```sh
tailscale serve --https=443 off
# or wipe ALL serve config:
tailscale serve reset
```

### Remove the password

```sh
security delete-generic-password -s 'opencode-server-password' -a "$USER"
```

Without this entry, `openweb` will fail on startup (intentional fail-loud behavior).

### Remove the wrapper + aliases

```sh
rm ~/code/scripts/personal/opencode-web.sh
# Then remove the openweb / openattach alias lines from
# ~/code/scripts/shell/rc/aliases.zsh
```

### Uninstall Tailscale

Use Tailscale's official uninstaller: <https://tailscale.com/kb/1247/uninstall-mac>.

### Optional: tear down tailnet HTTPS / MagicDNS

If you want a fully clean tailnet state, disable HTTPS Certificates and MagicDNS in the admin console (<https://login.tailscale.com/admin/dns>). Not required to disable opencode remote access — stopping `openweb` is sufficient.

---

## Files / locations

| Path | Purpose |
|------|---------|
| `~/code/scripts/personal/opencode-web.sh` | Wrapper script (loads keychain → caffeinate → opencode web) |
| `~/code/scripts/shell/rc/aliases.zsh` | Defines `openweb` and `openattach` aliases |
| `~/code/scripts/lib/keychain.sh` | Keychain helpers used by the wrapper |
| Keychain `opencode-server-password` (account `$USER`) | Server password (40-char random) |
| Tailscale Serve config (managed by `tailscaled`) | Persistent proxy `https://glitch.taila2ef4f.ts.net → http://127.0.0.1:4096` |
| `~/.project-plans/2026.05.08_opencode-web-ui.md` | Original design plan with rationale |

---

## Related

- opencode docs: <https://opencode.ai/docs/web/>, <https://opencode.ai/docs/server/>
- Tailscale Serve: <https://tailscale.com/kb/1312/serve>
- Tailscale HTTPS: <https://tailscale.com/kb/1153/enabling-https>
