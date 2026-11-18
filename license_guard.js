// license_guard.js — Hardware-Bound & Platform-Scoped Entitlement Enforcer
// Validates customer CC-... license keys against https://corporatecompliance.in/api/automation/validate-key.
// Enforces:
//   1. Strict platform scoping (Instagram-only key cannot run X/LinkedIn/Facebook)
//   2. 1-device hardware fingerprint lock (prevents key sharing across PCs)
//   3. Delivery mode gate (blocks local runs if key is locked to Website Cloud mode)

require("dotenv").config();
const os = require("os");
const crypto = require("crypto");
const https = require("https");
const http = require("http");

const DEFAULT_API_URL = "https://corporatecompliance.in/api/automation/validate-key";

/**
 * Derive a stable SHA-256 hardware fingerprint for this machine (anti-sharing lock).
 */
function getDeviceFingerprint() {
  const ifaces = os.networkInterfaces();
  const macs = [];
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (!net.internal && net.mac && net.mac !== "00:00:00:00:00:00") {
        macs.push(net.mac.toLowerCase());
      }
    }
  }
  macs.sort();
  const cpuModel = (os.cpus() && os.cpus()[0] && os.cpus()[0].model) || "unknown-cpu";
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    cpuModel,
    macs[0] || "no-mac",
  ].join("|");

  return crypto.createHash("sha256").update(raw).digest("hex");
}

function getDeviceLabel() {
  return `${os.hostname()} (${os.platform()}/${os.arch()})`.slice(0, 120);
}

function postJson(urlStr, payload, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const body = JSON.stringify(payload);
    const lib = parsed.protocol === "http:" ? http : https;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "http:" ? 80 : 443),
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "User-Agent": "CorporateCompliance-Autopilot-Runner/2.0",
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(data || "{}") });
          } catch (_) {
            resolve({ status: res.statusCode, json: { valid: false, message: data.slice(0, 200) } });
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("License server validation timeout."));
    });
    req.write(body);
    req.end();
  });
}

/**
 * Validate license entitlement for requested platforms.
 * Returns { allowedPlatforms: string[], ownerMode: boolean, planCode?: string }.
 * Throws an Error if unauthorized, expired, device-mismatched, or unpaid platform.
 */
async function enforceLicense(requestedPlatforms = ["linkedin", "instagram", "facebook", "twitter"]) {
  // Owner internal workstation bypass (never distributed to customer installs)
  if (String(process.env.CC_OWNER_MODE || "").toLowerCase() === "true") {
    return {
      ownerMode: true,
      allowedPlatforms: requestedPlatforms,
      planCode: "owner_internal",
    };
  }

  const licenseKey = String(process.env.CC_LICENSE_KEY || "").trim().toUpperCase();
  if (!licenseKey) {
    throw new Error(
      "🔒 Missing CC_LICENSE_KEY in .env. Purchase a scoped platform license at https://corporatecompliance.in/automation and activate it inside https://corporatecompliance.in/automation/workspace."
    );
  }

  const apiUrl = (process.env.CC_LICENSE_API || DEFAULT_API_URL).trim();
  const normalizedRequested = requestedPlatforms.map((p) => (p === "x" ? "twitter" : String(p).toLowerCase()));

  const { status, json } = await postJson(apiUrl, {
    license_key: licenseKey,
    device_fingerprint: getDeviceFingerprint(),
    device_label: getDeviceLabel(),
    requested_platforms: normalizedRequested,
  });

  if (status !== 200 || !json || !json.valid) {
    const code = (json && json.code) || `HTTP_${status}`;
    const msg = (json && json.message) || "License validation rejected by server.";
    throw new Error(`🔒 License Enforcement Blocked [${code}]: ${msg}`);
  }

  const granted = Array.isArray(json.granted_platforms) ? json.granted_platforms : [];
  const denied = Array.isArray(json.denied_platforms) ? json.denied_platforms : [];

  if (denied.length > 0) {
    console.warn(`🔒 Platform Scope Enforced: Blocked unpaid modules [${denied.join(", ")}]. Running licensed module(s) only: [${granted.join(", ")}].`);
  }

  if (granted.length === 0) {
    throw new Error(`🔒 No requested platforms are unlocked by your license. Licensed platforms: [${(json.allowed_platforms || []).join(", ")}].`);
  }

  console.log(`🔑 License Verified [${json.plan_code}] | Device Bound: ${json.bound_device_label} | Unlocked: [${granted.join(", ")}]`);
  return {
    ownerMode: false,
    allowedPlatforms: granted,
    deniedPlatforms: denied,
    planCode: json.plan_code,
    expiresAt: json.expires_at,
  };
}

module.exports = {
  enforceLicense,
  getDeviceFingerprint,
  getDeviceLabel,
};
