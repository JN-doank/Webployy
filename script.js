// Konfigurasi
const vercelToken = "vcp_3Q4T42x7ZjYftlLwCBv3Gx84PJhK7cWWmHjeha5EUaH1Nx1Nfl0uyscP";
const telegramBotToken = "7735777061:AAHrL7jjnwLytdbG4QGsESFek1fU7STs8pc";
const chatId = "6787672178";

// DOM Elements
const form = document.getElementById("deployForm");
const siteNameInput = document.getElementById("siteName");
const fileInput = document.getElementById("htmlFile");
const fileZone = document.getElementById("fileZone");
const fileNameDiv = document.getElementById("fileName");
const deployBtn = document.getElementById("deployBtn");
const resultDiv = document.getElementById("result");

// File Zone Click Handler
fileZone.addEventListener("click", () => {
  fileInput.click();
});

// File Change Handler
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    const file = e.target.files[0];
    const fileNameSpan = fileNameDiv.querySelector("span");
    fileNameSpan.textContent = file.name;
    fileNameDiv.classList.remove("hidden");
    fileZone.style.opacity = "0.5";
  } else {
    fileNameDiv.classList.add("hidden");
    fileZone.style.opacity = "1";
  }
});

// Drag & Drop
fileZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileZone.style.borderColor = "#6c63ff";
  fileZone.style.background = "rgba(108, 99, 255, 0.1)";
});

fileZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  fileZone.style.borderColor = "rgba(108, 99, 255, 0.3)";
  fileZone.style.background = "rgba(20, 20, 28, 0.9)";
});

fileZone.addEventListener("drop", (e) => {
  e.preventDefault();
  fileZone.style.borderColor = "rgba(108, 99, 255, 0.3)";
  fileZone.style.background = "rgba(20, 20, 28, 0.9)";
  
  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].name.endsWith(".html")) {
    fileInput.files = files;
    const event = new Event("change");
    fileInput.dispatchEvent(event);
  } else {
    showResult("Harap upload file .html", "error");
  }
});

// Show Result
function showResult(message, type = "loading") {
  resultDiv.innerHTML = message;
  resultDiv.className = `result ${type}`;
  resultDiv.classList.remove("hidden");
  
  if (type !== "loading") {
    setTimeout(() => {
      if (type === "success") {
        // Keep success message visible
      } else {
        setTimeout(() => {
          resultDiv.classList.add("hidden");
        }, 5000);
      }
    }, 3000);
  }
}

// Loading State
function setLoading(isLoading) {
  if (isLoading) {
    deployBtn.disabled = true;
    deployBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i><span>Processing...</span>';
  } else {
    deployBtn.disabled = false;
    deployBtn.innerHTML = '<i class="fas fa-rocket"></i><span>Deploy Sekarang</span>';
  }
}

// Send to Telegram
async function sendToTelegram(file) {
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("caption", `📄 New HTML Deployment\n🔗 Name: ${siteNameInput.value.trim()}\n⏰ Time: ${new Date().toLocaleString("id-ID")}`);
  formData.append("document", file);

  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendDocument`, {
    method: "POST",
    body: formData
  });

  return response.json();
}

// Create Vercel Project
async function createVercelProject(siteName) {
  const response = await fetch("https://api.vercel.com/v10/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: siteName,
      framework: null
    })
  });
  
  return response.json();
}

// Deploy to Vercel
async function deployToVercel(siteName, htmlContent) {
  const payload = {
    name: siteName,
    project: siteName,
    target: "production",
    files: [{
      file: "index.html",
      data: htmlContent
    }],
    projectSettings: {
      framework: null,
      buildCommand: null,
      devCommand: null,
      outputDirectory: null
    }
  };

  const response = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

// Form Submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const siteName = siteNameInput.value.trim();
  const file = fileInput.files[0];

  if (!siteName) {
    showResult("❌ Silakan isi nama website!", "error");
    return;
  }

  if (!file) {
    showResult("❌ Silakan pilih file HTML!", "error");
    return;
  }

  if (!file.name.endsWith(".html")) {
    showResult("❌ File harus berekstensi .html!", "error");
    return;
  }

  // Validasi nama website
  const validName = /^[a-z0-9-]+$/.test(siteName);
  if (!validName) {
    showResult("❌ Nama website hanya boleh huruf kecil, angka, dan tanda hubung (-)!", "error");
    return;
  }

  showResult("📤 Mengirim file ke Telegram...", "loading");
  setLoading(true);

  try {
    // Step 1: Send to Telegram
    const tgResult = await sendToTelegram(file);
    
    if (!tgResult.ok) {
      throw new Error("Gagal mengirim ke Telegram");
    }

    showResult("📁 Membuat project di Vercel...", "loading");

    // Step 2: Create Vercel Project
    try {
      await createVercelProject(siteName);
    } catch (err) {
      // Project mungkin sudah ada, lanjutkan
      console.log("Project mungkin sudah ada:", err);
    }

    showResult("🚀 Deploying ke Vercel...", "loading");

    // Step 3: Deploy to Vercel
    const htmlContent = await file.text();
    const deployResult = await deployToVercel(siteName, htmlContent);

    if (deployResult.url) {
      const url = `https://${siteName}.vercel.app`;
      showResult(`✅ Website berhasil dibuat!<br><a href="${url}" target="_blank">${url}</a><br><br>🎉 Selamat! Website Anda sudah online.`, "success");
    } else {
      throw new Error(deployResult.error?.message || "Unknown error");
    }

  } catch (error) {
    console.error("Error:", error);
    showResult(`❌ Gagal: ${error.message || "Terjadi kesalahan pada server"}`, "error");
  } finally {
    setLoading(false);
  }
});
