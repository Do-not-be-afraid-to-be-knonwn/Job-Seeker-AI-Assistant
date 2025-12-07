# Job Seeker AI Assistant - Setup Guide

Welcome! This guide will help you set up the Job Seeker AI Assistant on your computer.

## What You Need

- A Mac computer (macOS)
- Chrome browser
- Internet connection
- The credentials file from your team lead

## First-Time Setup

Follow these steps to get started:

### Step 1: Get the Project Folder

Download or copy the `Job-Seeker-AI-Assistant` folder to your computer.
You can put it anywhere you like (Desktop, Documents, etc.).

### Step 2: Add Your Credentials

1. Your team lead will send you a file called `credentials.env`
2. Copy that file into the `setup` folder inside the project
3. The file should be at: `Job-Seeker-AI-Assistant/setup/credentials.env`

**Don't have the credentials file?** Ask your team lead for it.

### Step 3: Start the Server

1. Open the `Job-Seeker-AI-Assistant` folder
2. Find the file called `StartServer.command`
3. Double-click it

**First time running?**
- macOS might show a security warning
- Right-click the file and choose "Open"
- Click "Open" again to confirm

The script will:
- Check if Node.js is installed (it will help you install it if needed)
- Install required software (this happens automatically on first run)
- Start the server

**Leave the window open!** The server runs while that window is open.

### Step 4: Install Chrome Extension

See the [Chrome Extension Installation Guide](CHROME_EXTENSION_GUIDE.md) for detailed instructions with screenshots.

Quick summary:
1. Open Chrome and go to `chrome://extensions/`
2. Turn on "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `src/chrome-extension-template` folder
5. Done!

## Daily Use

Once you've completed the first-time setup, using the app is simple:

1. **Start the server**: Double-click `StartServer.command`
2. **Use the extension**: Browse job postings on Indeed.com

The Chrome extension will automatically appear when you click on a job listing.

## Stopping the Server

To stop the server:
- Press `Ctrl+C` in the terminal window, OR
- Just close the terminal window

## Troubleshooting

### "Node.js is not installed"

**What this means**: Your computer needs Node.js to run the server.

**How to fix**:
1. The script will automatically open the Node.js download page
2. Download the LTS version (the one recommended for most users)
3. Install it by following the installer prompts
4. Restart your computer
5. Try running `StartServer.command` again

### "Credentials file not found"

**What this means**: The server can't find your API keys.

**How to fix**:
1. Make sure you received the `credentials.env` file from your team lead
2. Copy it to the `setup` folder
3. The path should be: `Job-Seeker-AI-Assistant/setup/credentials.env`
4. Try running `StartServer.command` again

**Still not working?** Ask your team lead to send the credentials file again.

### "Failed to install dependencies"

**What this means**: The server couldn't download required software.

**How to fix**:
1. Check your internet connection
2. Make sure you're not behind a restrictive firewall
3. Try running `StartServer.command` again
4. If it still doesn't work, contact your team lead

### Chrome Extension Not Appearing

**What this means**: The extension isn't loading on Indeed job pages.

**How to fix**:
1. Make sure the server is running (the terminal window is open)
2. Go to `chrome://extensions/` and check if "Job Seeker AI Assistant" is enabled
3. Refresh the Indeed page
4. Try clicking on a different job listing

### "Authentication required" in Extension

**What this means**: You need to sign in with your Google account.

**How to fix**:
1. Click the "Sign In" button in the extension sidebar
2. Sign in with your Google account
3. You only need to do this once

## Getting Updates

When your team adds new features:

**Option 1: Git Pull (if you're comfortable with git)**
1. Open Terminal
2. Navigate to the project folder
3. Run: `git pull`
4. Double-click `StartServer.command` again

**Option 2: Replace Files (easier)**
1. Download the new project folder
2. Copy your `credentials.env` file from the old `setup` folder
3. Paste it into the new `setup` folder
4. Double-click `StartServer.command`

The script will automatically install any new software needed.

## Need Help?

If you run into any problems:

1. **Check this guide** - Most common issues are covered above
2. **Ask your team lead** - They can help with credentials or project-specific issues
3. **Check the terminal window** - Error messages often explain what went wrong

## What's Running?

When you start the server, here's what happens:
- A local web server starts on your computer
- It runs at `http://localhost:3000`
- The Chrome extension connects to this server
- AI features analyze job postings you visit
- Everything runs locally on your machine

**Is it safe?** Yes! The server only runs on your computer and doesn't share data externally.

## File Structure

You don't need to worry about most files, but here's what's important:

```
Job-Seeker-AI-Assistant/
├── StartServer.command          ← Double-click this to start
├── setup/
│   ├── credentials.env          ← Your API keys (you add this)
│   └── README.md               ← You're reading this!
└── src/
    └── chrome-extension-template/  ← Load this in Chrome
```

---

**Happy job hunting! 🎯**
