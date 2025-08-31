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
    <div class="job-ai-sidebar-content">
      <div class="job-ai-loading">Analyzing job posting...</div>
    </div>
  `;
  const closeBtn = sidebar.querySelector(".job-ai-sidebar-close");
  closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("open");
  });
  document.body.appendChild(sidebar);
  return sidebar;
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
  const domain = data.domains?.result?.domains || "Not detected";
  const years = data.years?.result?.requestYears ?? "Not specified";
  const level = data.level?.result?.text?.level || "Not specified";

  content.innerHTML = `
    <div class="job-ai-card">
      <div class="job-ai-card-title"><span class="job-ai-card-icon">🗂️</span>Domain</div>
      <div>${
        domain
          ? `<span class="job-ai-pill">${domain}</span>`
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
          const error = response?.error || "Failed to extract job information";
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
  module.exports = { updateSidebarContent };
}
