# Chrome Extension Installation Guide

This guide shows you how to install the Job Seeker AI Assistant Chrome extension.

**Time needed**: About 2 minutes
**You only need to do this once!**

---

## Before You Start

Make sure:
- ✅ You have Chrome browser installed
- ✅ The server is running (you double-clicked `StartServer.command`)
- ✅ You have the project folder on your computer

---

## Step 1: Open Chrome Extensions Page

**Option A - Using the address bar:**
1. Open Chrome browser
2. Click on the address bar at the top
3. Type: `chrome://extensions/`
4. Press Enter

**Option B - Using the menu:**
1. Open Chrome browser
2. Click the three dots menu (⋮) in the top-right corner
3. Hover over "Extensions"
4. Click "Manage Extensions"

You should now see the Extensions page.

---

## Step 2: Enable Developer Mode

1. Look at the **top-right corner** of the Extensions page
2. Find the toggle switch labeled "Developer mode"
3. **Turn it ON** (the switch should turn blue)

**What this does**: Developer mode lets you load extensions that haven't been published to the Chrome Web Store. This is normal for internal tools!

---

## Step 3: Click "Load unpacked"

After enabling Developer mode, you'll see new buttons appear:

1. Look for the button that says **"Load unpacked"**
2. Click it

A file browser window will open.

---

## Step 4: Select the Extension Folder

In the file browser:

1. Navigate to your `Job-Seeker-AI-Assistant` folder
2. Open the `src` folder
3. Find and select the `chrome-extension-template` folder
4. Click the "Select" or "Choose" button

**Full path**: `Job-Seeker-AI-Assistant/src/chrome-extension-template/`

**Important**: Make sure you select the `chrome-extension-template` folder itself, not a file inside it!

---

## Step 5: Verify Installation

After selecting the folder, you should see:

1. A new card appears on the Extensions page
2. It's labeled **"Job Seeker AI Assistant"**
3. The toggle switch is blue (enabled)
4. It shows version information

**If you see this, you're done!** ✅

---

## Step 6: Test It Out

Let's make sure everything works:

1. Keep the server running (the `StartServer.command` window should be open)
2. Open a new tab in Chrome
3. Go to [Indeed.com](https://indeed.com)
4. Search for any job
5. Click on a job listing

**What should happen:**
- A sidebar should appear on the right side of the page
- It will show AI-analyzed information about the job
- You might see a "Sign In" button first - this is normal!

**If the sidebar appears, congratulations!** Your extension is working. 🎉

---

## Troubleshooting

### "This extension may soon no longer be supported"

**What this means**: Chrome shows this warning for developer-mode extensions.

**Is it a problem?** No! This is normal for internal tools. The extension will keep working.

**What to do**: You can ignore this message.

---

### Extension card shows errors

**Common errors and fixes:**

**Error: "Manifest file is missing or unreadable"**
- You selected the wrong folder
- Go back to Step 4 and make sure you select the `chrome-extension-template` folder

**Error: "Invalid manifest"**
- The extension files might be corrupted
- Ask your team lead for a fresh copy of the project

---

### Sidebar doesn't appear on Indeed

**What to try:**

1. **Check the server is running**
   - Look for the terminal window from `StartServer.command`
   - It should show "Server running on http://localhost:3000"

2. **Check the extension is enabled**
   - Go to `chrome://extensions/`
   - Find "Job Seeker AI Assistant"
   - Make sure the toggle is blue (enabled)

3. **Refresh the page**
   - Go back to the Indeed job listing
   - Press F5 or click the refresh button
   - Try clicking a different job

4. **Check for errors**
   - On the Extensions page, click "Details" under the extension
   - Scroll down to "Inspect views"
   - If you see errors listed, share them with your team lead

---

### "Authentication required" appears in sidebar

**What this means**: The extension needs you to sign in.

**How to fix**:
1. Click the "Sign In" button in the sidebar
2. Sign in with your Google account
3. Allow the requested permissions
4. You're all set!

**You only need to sign in once** - the extension will remember you.

---

## Updating the Extension

When your team updates the extension code:

**Option 1: Automatic (recommended)**
1. The extension usually updates automatically when the server restarts
2. Just refresh the Indeed page

**Option 2: Manual reload**
1. Go to `chrome://extensions/`
2. Find "Job Seeker AI Assistant"
3. Click the refresh icon (↻) on the extension card

**Option 3: Reinstall**
1. Go to `chrome://extensions/`
2. Click "Remove" on the extension card
3. Follow Steps 3-4 again to reload it

---

## Uninstalling the Extension

If you need to remove the extension:

1. Go to `chrome://extensions/`
2. Find "Job Seeker AI Assistant"
3. Click the "Remove" button
4. Confirm when prompted

**Note**: This won't delete any project files - just removes the extension from Chrome.

---

## How the Extension Works

Here's what happens behind the scenes:

1. **You visit a job listing on Indeed**
2. **Extension detects the job page** and extracts the job details
3. **Sends details to your local server** (running on your computer)
4. **AI analyzes the job** and extracts:
   - Required skills
   - Technical domain (Frontend, Backend, etc.)
   - Experience level
   - Years of experience needed
5. **Results appear in the sidebar** within a few seconds

**Everything runs on your computer** - no data is sent to external servers!

---

## Privacy & Security

**Is my data safe?**
- Yes! Everything runs locally on your Mac
- The extension only works on Indeed.com pages
- Job data is sent to your local server (localhost:3000)
- No information leaves your computer (except API calls to Google Gemini for AI processing)

**What permissions does it need?**
- Access to Indeed.com pages (to read job postings)
- Storage (to save your login status)
- Identity (for Google sign-in)

---

## Getting Help

If something isn't working:

1. **Check the main README** - See `setup/README.md` for general troubleshooting
2. **Ask your team lead** - They can help with team-specific issues
3. **Check the console** - Right-click on the page → Inspect → Console tab (for technical errors)

---

**Questions?** Ask your team lead or check the main setup guide!

Happy job hunting! 🎯
