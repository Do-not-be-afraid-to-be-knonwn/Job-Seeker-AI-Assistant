console.log("Content script loaded");

// Enhanced sidebar styles for modern card UI
const createSidebarStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    .job-ai-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 410px;
      height: 100vh;
      background: #f6f8fa;
      border-left: none;
      box-shadow: -2px 0 16px rgba(0,0,0,0.10);
      z-index: 10000;
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      overflow-y: auto;
      border-radius: 16px 0 0 16px;
      padding: 0;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(.4,0,.2,1);
    }
    .job-ai-sidebar.open {
      transform: translateX(0);
    }
    .job-ai-sidebar-header {
      display: flex;
      align-items: center;
      background: #2563eb;
      color: #fff;
      padding: 20px 24px 18px 24px;
      border-radius: 16px 0 0 0;
      font-size: 20px;
      font-weight: 700;
      position: relative;
      box-shadow: 0 2px 8px rgba(37,99,235,0.08);
    }
    .job-ai-header-icon {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      vertical-align: middle;
    }
    .job-ai-sidebar-close {
      position: absolute;
      top: 18px;
      right: 18px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .job-ai-sidebar-close:hover {
      background: #1e40af;
    }
    .job-ai-auth {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 8px 18px;
    }
    .job-ai-auth-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 14px;
    }
    .job-ai-auth-btn:hover {
      background: #1e40af;
    }
    .job-ai-sidebar-content {
      padding: 24px 18px 24px 18px;
    }
    .job-ai-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      margin-bottom: 18px;
      padding: 18px 20px 14px 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .job-ai-card-title {
      display: flex;
      align-items: center;
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
      gap: 8px;
    }
    .job-ai-card-icon {
      font-size: 20px;
      margin-right: 6px;
      vertical-align: middle;
    }
    .job-ai-pill {
      display: inline-block;
      background: #2563eb;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      border-radius: 16px;
      padding: 4px 16px;
      margin: 2px 6px 2px 0;
      line-height: 1.7;
      box-shadow: 0 1px 2px rgba(37,99,235,0.08);
    }
    .job-ai-skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 2px;
    }
    .job-ai-skill-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 12px;
      border-radius: 14px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 4px;
      margin-right: 6px;
      box-shadow: 0 1px 2px rgba(25,118,210,0.08);
    }
    .job-ai-loading {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      font-size: 16px;
    }
    .job-ai-error {
      color: #d32f2f;
      background: #ffebee;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
      font-size: 15px;
      text-align: center;
    }
    .job-ai-feedback-buttons {
      display: flex;
      gap: 10px;
      margin-bottom: 8px;
    }
    .job-ai-feedback-btn {
      background: #e5e7eb;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
    }
    .job-ai-feedback-btn:hover {
      background: #d1d5db;
    }
    .job-ai-feedback-comment {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 8px;
      font-family: inherit;
      font-size: 14px;
    }
    .job-ai-feedback-submit {
      align-self: flex-end;
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .job-ai-feedback-submit:hover {
      background: #1e40af;
    }
    .job-ai-success-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      z-index: 10001;
      font-family: 'Segoe UI', Roboto, Arial, sans-serif;
      font-size: 14px;
      font-weight: 500;
      animation: slideInFromRight 0.3s ease-out;
      transition: opacity 0.3s ease-out;
    }
    .job-ai-success-notification.hiding {
      opacity: 0;
    }
    @keyframes slideInFromRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .job-ai-auth-status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      font-size: 12px;
    }
    .job-ai-auth-status.signed-in {
      color: #10b981;
      background: #ecfdf5;
    }
    .job-ai-auth-status.signed-out {
      color: #ef4444;
      background: #fef2f2;
    }
    .job-ai-auth-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .job-ai-auth-indicator.online {
      background: #10b981;
    }
    .job-ai-auth-indicator.offline {
      background: #ef4444;
    }
  `;
  document.head.appendChild(style);
};

// Enhanced sidebar HTML and content rendering
const createSidebar = () => {
  const sidebar = document.createElement("div");
  sidebar.className = "job-ai-sidebar";
  sidebar.innerHTML = `
    <div class="job-ai-sidebar-header">
      <span class="job-ai-header-icon">🤖</span>
      <span>Job AI Assistant</span>
      <button class="job-ai-sidebar-close">&times;</button>
    </div>
    <div class="job-ai-auth-status signed-out" id="authStatus">
      <div class="job-ai-auth-indicator offline"></div>
      <span>Not signed in</span>
    </div>
    <div class="job-ai-auth">
      <button class="job-ai-auth-btn job-ai-login">Sign In</button>
      <button class="job-ai-auth-btn job-ai-logout" style="display: none;">Sign Out</button>
    </div>
    <div class="job-ai-sidebar-content">
      <div class="job-ai-loading">Analyzing job posting...</div>
    </div>
  `;
  const closeBtn = sidebar.querySelector(".job-ai-sidebar-close");
  closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("open");
  });
  const loginBtn = sidebar.querySelector(".job-ai-login");
  loginBtn.addEventListener("click", () => {
    console.log('Login button clicked');
    chrome.runtime.sendMessage({ type: "AUTH_LOGIN" }, (response) => {
      console.log('Login response:', response);
      if (response && response.success) {
        showSuccessNotification("✅ Successfully signed in to Job AI Assistant!");
        updateAuthStatus(true);
      } else {
        const errorMsg = response?.error || "Sign in failed. Please try again.";
        console.error('Login failed:', errorMsg);
        showSuccessNotification(`❌ ${errorMsg}`, false);
        updateAuthStatus(false);
      }
    });
  });
  const logoutBtn = sidebar.querySelector(".job-ai-logout");
  logoutBtn.addEventListener("click", () => {
    console.log('Logout button clicked');
    chrome.runtime.sendMessage({ type: "AUTH_LOGOUT" }, (response) => {
      console.log('Logout response:', response);
      if (response && response.success) {
        showSuccessNotification("👋 Successfully signed out!");
        updateAuthStatus(false);
      } else {
        console.error('Logout failed:', response?.error);
        // Even if logout "fails", we should probably still show as logged out
        updateAuthStatus(false);
      }
    });
  });
  document.body.appendChild(sidebar);
  
  // Check authentication status on sidebar creation
  checkAuthenticationStatus(sidebar);
  
  return sidebar;
};

// Function to show success notifications
const showSuccessNotification = (message, isSuccess = true) => {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.job-ai-success-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'job-ai-success-notification';
  notification.textContent = message;
  
  // Change color for error messages
  if (!isSuccess) {
    notification.style.background = '#ef4444';
    notification.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
  }
  
  document.body.appendChild(notification);

  // Auto-hide after 4 seconds
  setTimeout(() => {
    notification.classList.add('hiding');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300); // Wait for fade out animation
  }, 4000);
};

// Function to update authentication status display
const updateAuthStatus = (isAuthenticated) => {
  console.log('Updating auth status to:', isAuthenticated);
  currentAuthStatus = isAuthenticated; // Track current status
  
  const authStatus = document.getElementById('authStatus');
  const loginBtn = document.querySelector('.job-ai-login');
  const logoutBtn = document.querySelector('.job-ai-logout');
  const indicator = authStatus?.querySelector('.job-ai-auth-indicator');
  const statusText = authStatus?.querySelector('span');

  if (isAuthenticated) {
    authStatus?.classList.remove('signed-out');
    authStatus?.classList.add('signed-in');
    indicator?.classList.remove('offline');
    indicator?.classList.add('online');
    if (statusText) statusText.textContent = 'Signed in';
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
  } else {
    authStatus?.classList.remove('signed-in');
    authStatus?.classList.add('signed-out');
    indicator?.classList.remove('online');
    indicator?.classList.add('offline');
    if (statusText) statusText.textContent = 'Not signed in';
    
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
};

// Function to check current authentication status
const checkAuthenticationStatus = (sidebar) => {
  console.log('Checking authentication status...');
  chrome.runtime.sendMessage({ type: "CHECK_AUTH_STATUS" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Auth status check failed:', chrome.runtime.lastError);
      // Extension context might be invalid, assume not authenticated
      updateAuthStatus(false);
      return;
    }
    
    console.log('Auth status response:', response);
    const isAuthenticated = response && response.isAuthenticated;
    console.log('Is authenticated:', isAuthenticated);
    updateAuthStatus(isAuthenticated);
  });
};

const updateSidebarContent = (
  sidebar,
  data,
  error = null,
  jobContext = null
) => {
  const content = sidebar.querySelector(".job-ai-sidebar-content");

  // Show loading state if both data and error are null
  if (!data && !error) {
    content.innerHTML = `
      <div class="job-ai-loading">Analyzing job posting...</div>
    `;
    return;
  }
  if (error) {
    content.innerHTML = `
      <div class="job-ai-error">
        <strong>Error:</strong> ${error}
      </div>
    `;
    return;
  }
  // Extract nested values
  const skills = data.skills?.result?.skills || [];
  const domains = data.domain?.result?.domains || [];
  const years = data.years?.result?.requestYears ?? "Not specified";
  const level = data.level?.result?.text?.level || "Not specified";

  content.innerHTML = `
    <div class="job-ai-card">
      <div class="job-ai-card-title"><span class="job-ai-card-icon">🗂️</span>Domain</div>
      <div>${
        domains.length > 0
          ? domains.map(d => `<span class="job-ai-pill">${d}</span>`).join('')
          : '<span style="color:#888">Not detected</span>'
      }</div>
    </div>
    <div class="job-ai-card">
      <div class="job-ai-card-title"><span class="job-ai-card-icon">📝</span>Level</div>
      <div>${
        level
          ? `<span class="job-ai-pill">${level}</span>`
          : '<span style="color:#888">Not specified</span>'
      }</div>
    </div>
    <div class="job-ai-card">
      <div class="job-ai-card-title"><span class="job-ai-card-icon">⏰</span>Experience</div>
      <div>${
        years !== "Not specified"
          ? `<span class="job-ai-pill">${years} years</span>`
          : '<span style="color:#888">Not specified</span>'
      }</div>
    </div>
    <div class="job-ai-card">
      <div class="job-ai-card-title"><span class="job-ai-card-icon">💼</span>Skills</div>
      <div class="job-ai-skills-list">
        ${
          skills.length > 0
            ? skills
                .map(
                  (skill) => `<span class="job-ai-skill-tag">${skill}</span>`
                )
                .join("")
            : '<span style="color:#888">No specific skills detected</span>'
        }
      </div>
    </div>
  `;

  if (data) {
    const feedbackCard = document.createElement("div");
    feedbackCard.className = "job-ai-card";
    feedbackCard.innerHTML = `
      <div class="job-ai-card-title"><span class="job-ai-card-icon">💬</span>Feedback</div>
      <div class="job-ai-feedback-buttons">
        <button class="job-ai-feedback-btn" data-rating="up">👍</button>
        <button class="job-ai-feedback-btn" data-rating="down">👎</button>
      </div>
      <textarea class="job-ai-feedback-comment" placeholder="Additional comments" rows="3"></textarea>
      <button class="job-ai-feedback-submit">Submit</button>
    `;
    content.appendChild(feedbackCard);

    const sendFeedback = (payload) => {
      chrome.runtime.sendMessage({
        type: "USER_FEEDBACK",
        payload: { ...payload, job: jobContext, extraction: data },
      });
    };

    feedbackCard.querySelectorAll(".job-ai-feedback-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rating = btn.dataset.rating;
        sendFeedback({ rating });
      });
    });

    const submitBtn = feedbackCard.querySelector(".job-ai-feedback-submit");
    submitBtn.addEventListener("click", () => {
      const comment = feedbackCard
        .querySelector(".job-ai-feedback-comment")
        .value.trim();
      if (comment) {
        sendFeedback({ comment });
        feedbackCard.querySelector(".job-ai-feedback-comment").value = "";
      }
    });
  }
};

// 初始化侧边栏
let sidebar = null;
let currentAuthStatus = null; // Track current authentication status

// 工具函数：等待职位描述面板加载完成
const waitForJobPanel = () => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const title = document.querySelector("#jobsearch-ViewjobPaneWrapper");
      //const description = document.querySelector("#jobDescriptionText");
      if (title) {
        clearInterval(interval);
        resolve(true);
      }
    }, 500);
  });
};

// 监听左侧职位卡片的点击事件
document.addEventListener("click", async (event) => {
  const card = event.target.closest(".job_seen_beacon");
  if (!card) return;

  // 等待右侧面板加载完成
  await waitForJobPanel();
  console.log("Clicked on a job card");

  // 创建侧边栏（如果还没有创建）
  if (!sidebar) {
    createSidebarStyles();
    sidebar = createSidebar();
  } else {
    // If sidebar already exists, restore the previous auth status
    if (currentAuthStatus !== null) {
      console.log('Restoring auth status:', currentAuthStatus);
      updateAuthStatus(currentAuthStatus);
    }
  }

  // 显示侧边栏并显示加载状态
  sidebar.classList.add("open");
  updateSidebarContent(sidebar, null);

  // 从右侧面板抓取信息
  const title =
    document.querySelector('h2[data-testid="jobsearch-JobInfoHeader-title"]')
      ?.innerText || "";

  const container = document.querySelector("#jobDescriptionText");

  // Select all <p> and <li> tags inside
  const textElements = container?.querySelectorAll("p, li");

  const description = Array.from(textElements)
    .map((el) => el.innerText.trim())
    .filter((text) => text.length > 0)
    .join("\n");

  const jobData = {
    title,
    description: "Description: " + description,
  };
  console.log(`Sending job data: ${jobData.title}`);
  //console.log(`Sending job data: ${jobData.description}`);

  // 发送消息并处理响应
  try {
    chrome.runtime.sendMessage(
      { type: "INDEED_JOB_DETAIL", job: jobData },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Extension context invalidated:", chrome.runtime.lastError.message);
          updateSidebarContent(sidebar, null, "Extension needs to be refreshed", jobData);
          return;
        }
        
        console.log("Received response:", response);
        if (response && response.success) {
          updateSidebarContent(sidebar, response.extraction, null, jobData);
        } else {
          let error = response?.error || "Failed to extract job information";
          
          // Add authentication prompt if auth is required
          if (response?.requiresAuth) {
            error += " Please use the Sign In button above.";
            // Only update auth status if we don't already know the status
            // This prevents overriding a known good status
            if (currentAuthStatus !== false) {
              console.log('Job extraction requires auth, updating status to false');
              updateAuthStatus(false);
            }
          }
          
          updateSidebarContent(sidebar, null, error, jobData);
        }
      }
    );
  } catch (error) {
    console.error("Extension context invalidated:", error);
    updateSidebarContent(sidebar, null, "Extension needs to be refreshed", jobData);
  }
});

// Export for testing purposes when running in Node environment
if (typeof module !== "undefined") {
  module.exports = { updateSidebarContent, createSidebar };
}
