(function () {
  "use strict";

  let adminPassword = null;

  const els = {
    claimBox: document.getElementById("claimBox"),
    loginBox: document.getElementById("loginBox"),
    forgotBox: document.getElementById("forgotBox"),
    configBox: document.getElementById("configBox"),
    dashboard: document.getElementById("dashboard"),
  };

  async function callBackend(payload) {
    if (!window.APPS_SCRIPT_URL || APPS_SCRIPT_URL.indexOf("PASTE_YOUR") === 0) {
      throw new Error("CONFIG_MISSING");
    }
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Network error: " + res.status);
    return res.json();
  }

  function hideAllBoxes() {
    Object.values(els).forEach((el) => { el.hidden = true; });
  }
  function showClaim() { hideAllBoxes(); els.claimBox.hidden = false; }
  function showLogin() { hideAllBoxes(); els.loginBox.hidden = false; }
  function showForgot() { hideAllBoxes(); els.forgotBox.hidden = false; }
  function showConfigNotice() { hideAllBoxes(); els.configBox.hidden = false; }
  function showDashboard() { hideAllBoxes(); els.dashboard.hidden = false; }
  window.showForgot = showForgot;
  window.showLogin = showLogin;

  // ---------- Initial load ----------
  async function init() {
    try {
      const resp = await callBackend({ action: "adminGetStatus" });
      if (resp.claimed) {
        document.getElementById("loginHint").textContent =
          resp.maskedEmail ? "Registered admin: " + resp.maskedEmail : "";
        showLogin();
      } else {
        showClaim();
      }
    } catch (err) {
      if (err.message === "CONFIG_MISSING") {
        showConfigNotice();
      } else {
        showLogin();
        document.getElementById("loginError").textContent =
          "Could not reach the server. Check your internet connection and config.js.";
      }
    }
  }

  // ---------- Claim flow ----------
  window.sendClaimOtp = async function () {
    const email = document.getElementById("claimEmail").value.trim();
    const msgEl = document.getElementById("claimStep1Msg");
    msgEl.textContent = "";
    if (!email) { msgEl.textContent = "Enter your email."; return; }

    const btn = document.getElementById("claimSendBtn");
    btn.disabled = true;
    try {
      const resp = await callBackend({ action: "adminSendClaimOtp", email });
      if (resp.success) {
        document.getElementById("claimStep1").hidden = true;
        document.getElementById("claimStep2").hidden = false;
      } else {
        msgEl.textContent = resp.message || "Could not send OTP.";
      }
    } catch (err) {
      msgEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  };

  window.claimAccess = async function () {
    const email = document.getElementById("claimEmail").value.trim();
    const otp = document.getElementById("claimOtp").value.trim();
    const pw = document.getElementById("claimPassword").value;
    const pw2 = document.getElementById("claimPasswordConfirm").value;
    const msgEl = document.getElementById("claimStep2Msg");
    msgEl.textContent = "";
    if (pw !== pw2) { msgEl.textContent = "Passwords do not match."; return; }
    if (pw.length < 6) { msgEl.textContent = "Password must be at least 6 characters."; return; }

    const btn = document.getElementById("claimSubmitBtn");
    btn.disabled = true;
    try {
      const resp = await callBackend({ action: "adminClaim", email, otp, newPassword: pw });
      if (resp.success) {
        adminPassword = pw;
        document.getElementById("adminEmailTag").textContent = email;
        showDashboard();
        loadRows();
      } else {
        msgEl.textContent = resp.message || "Could not claim admin access.";
      }
    } catch (err) {
      msgEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  };

  // ---------- Login ----------
  window.login = async function () {
    const pw = document.getElementById("passwordInput").value;
    const msgEl = document.getElementById("loginError");
    msgEl.textContent = "";
    if (!pw) return;
    try {
      const resp = await callBackend({ action: "adminLogin", password: pw });
      if (resp.success && resp.ok) {
        adminPassword = pw;
        showDashboard();
        loadRows();
      } else {
        msgEl.textContent = "Incorrect password.";
      }
    } catch (err) {
      msgEl.textContent = err.message;
    }
  };

  window.logout = function () {
    adminPassword = null;
    document.getElementById("passwordInput").value = "";
    showLogin();
  };

  // ---------- Forgot password ----------
  window.sendResetOtp = async function () {
    const email = document.getElementById("forgotEmail").value.trim();
    const msgEl = document.getElementById("forgotStep1Msg");
    msgEl.textContent = "";
    if (!email) { msgEl.textContent = "Enter your email."; return; }
    try {
      const resp = await callBackend({ action: "adminSendResetOtp", email });
      if (resp.success) {
        document.getElementById("forgotStep1").hidden = true;
        document.getElementById("forgotStep2").hidden = false;
      } else {
        msgEl.textContent = resp.message || "Could not send OTP.";
      }
    } catch (err) {
      msgEl.textContent = err.message;
    }
  };

  window.resetPassword = async function () {
    const email = document.getElementById("forgotEmail").value.trim();
    const otp = document.getElementById("forgotOtp").value.trim();
    const pw = document.getElementById("forgotPassword").value;
    const pw2 = document.getElementById("forgotPasswordConfirm").value;
    const msgEl = document.getElementById("forgotStep2Msg");
    msgEl.textContent = "";
    if (pw !== pw2) { msgEl.textContent = "Passwords do not match."; return; }
    if (pw.length < 6) { msgEl.textContent = "Password must be at least 6 characters."; return; }
    try {
      const resp = await callBackend({ action: "adminResetPassword", email, otp, newPassword: pw });
      if (resp.success) {
        msgEl.className = "msg success";
        msgEl.textContent = "Password updated — you can log in now.";
        setTimeout(() => {
          msgEl.className = "msg error";
          showLogin();
        }, 1500);
      } else {
        msgEl.textContent = resp.message || "Could not reset password.";
      }
    } catch (err) {
      msgEl.textContent = err.message;
    }
  };

  // ---------- Dashboard ----------
  window.loadRows = async function () {
    document.getElementById("loadingMsg").hidden = false;
    document.getElementById("rowsTable").hidden = true;
    document.getElementById("emptyMsg").hidden = true;
    try {
      const resp = await callBackend({ action: "adminListAccess", password: adminPassword });
      document.getElementById("loadingMsg").hidden = true;
      if (!resp.success) {
        alert("Error: " + (resp.message || "Could not load access list."));
        if (resp.message && resp.message.indexOf("Incorrect password") !== -1) showLogin();
        return;
      }
      renderRows(resp.rows || []);
    } catch (err) {
      document.getElementById("loadingMsg").hidden = true;
      alert("Error: " + err.message);
    }
  };

  function renderRows(rows) {
    const counts = { pending: 0, approved: 0, denied: 0 };
    rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    document.getElementById("summary").innerHTML =
      `<div class="summary-card"><div class="n">${counts.pending}</div><div class="l">Pending</div></div>` +
      `<div class="summary-card"><div class="n">${counts.approved}</div><div class="l">Approved</div></div>` +
      `<div class="summary-card"><div class="n">${counts.denied}</div><div class="l">Denied</div></div>`;

    if (rows.length === 0) {
      document.getElementById("emptyMsg").hidden = false;
      return;
    }

    const body = document.getElementById("rowsBody");
    body.innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${escapeHtml(r.mobile)}</td>` +
        `<td>${escapeHtml(r.name)}</td>` +
        `<td><span class="status-pill status-${r.status}">${r.status}</span></td>` +
        `<td>${escapeHtml(r.requestedAt)}</td>` +
        `<td>${escapeHtml(r.decidedAt)}</td>` +
        `<td class="actions">
          <button class="approve" data-mobile="${escapeHtml(r.mobile)}" data-status="approved">Approve</button>
          <button class="deny" data-mobile="${escapeHtml(r.mobile)}" data-status="denied">Deny</button>
        </td>`;
      body.appendChild(tr);
    });
    document.getElementById("rowsTable").hidden = false;

    body.querySelectorAll("button[data-mobile]").forEach((btn) => {
      btn.addEventListener("click", () => setStatus(btn.dataset.mobile, btn.dataset.status));
    });
  }

  async function setStatus(mobile, status) {
    try {
      const resp = await callBackend({ action: "adminSetStatus", password: adminPassword, mobile, status });
      if (!resp.success) {
        alert("Error: " + (resp.message || "Could not update status."));
        return;
      }
      loadRows();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s || "";
    return div.innerHTML;
  }

  init();
})();
