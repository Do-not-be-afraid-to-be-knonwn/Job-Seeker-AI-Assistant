# Local Setup Workflow - Implementation Decision

**Date**: 2025-12-06
**Branch**: `feature/local-setup-workflow`
**Status**: In Progress

## Decision: Option A - Simple Script Approach

We are implementing a **simple, macOS-focused setup workflow** for non-technical product team members to run the Job Seeker AI Assistant locally.

## What We're Building

### Core Components
1. **`StartServer.command`** - Double-clickable launcher script
   - Auto-checks Node.js installation
   - Runs `npm install` when needed
   - Loads environment variables
   - Starts the server with clear messaging

2. **`setup/credentials.env`** - Team credentials template
   - Shared API keys (Gemini, Google OAuth, LangSmith)
   - Gitignored for security
   - Distributed separately via Slack/1Password

3. **`setup/README.md`** - User-facing setup guide
   - Plain English, zero technical jargon
   - 4-step first-time setup
   - Troubleshooting section

4. **Chrome Extension Guide** - Visual installation instructions
   - Step-by-step screenshots
   - One-time manual loading process

5. **`.gitignore`** - Updated to exclude credentials

## Why Option A?

### User Requirements
- **Target audience**: Non-technical macOS users (product team)
- **Use case**: Manual testing, no code editing
- **Priority**: Fewer steps, maximum simplicity

### Advantages
✅ **Zero terminal commands** - Everything via double-click
✅ **No Docker complexity** - Avoids Docker Desktop installation
✅ **No build process** - Server runs via ts-node directly
✅ **Fast setup** - ~5 minutes first time, ~10 seconds daily
✅ **Secure credentials** - Never committed to git
✅ **Easy maintenance** - Simple to update and debug

## Alternatives Considered

### Option B: Docker + Simple Script
- **Rejected**: Too complex for current team size
- **When to revisit**: When team grows beyond 10 people or needs cross-platform support

### Option C: Docker Only
- **Rejected**: Requires Docker Desktop installation (extra complexity)
- **Problem**: Still doesn't solve Chrome extension installation

### Option D: macOS App Bundle
- **Rejected**: Over-engineered for testing environment
- **Problem**: Requires code signing, complex build process

### Option E: npm Global Install
- **Rejected**: Still requires terminal commands
- **Problem**: Doesn't simplify credential management

## Chrome Extension Handling

**Decision**: Manual loading via Chrome Developer Mode

**Why**:
- Chrome security prevents programmatic installation
- Chrome Web Store requires $5 fee + multi-day review process
- Manual loading is standard for internal tools
- One-time setup persists between Chrome restarts

**Alternative**: Visual guide with screenshots makes it painless

## Future Evolution Path

### Phase 1 (Now - 3 months): Simple Script ✅
- Current implementation
- Optimized for small macOS team

### Phase 2 (3-6 months): Add Docker Option
- Keep simple script for developers
- Add Docker Compose for cross-platform support
- Triggered by: Windows/Linux team members joining

### Phase 3 (6+ months): Production Ready
- Publish Chrome extension to Web Store
- Cloud hosting (AWS/GCP/Azure)
- Proper secret management service
- CI/CD pipeline

## Implementation Files

**New Files**:
- `StartServer.command` - Launcher script
- `setup/credentials.env` - Credentials template
- `setup/README.md` - User guide
- `setup/CHROME_EXTENSION_GUIDE.md` - Extension setup
- `.gitignore` - Security update

**Modified Files**:
- None (server works as-is)

## Success Criteria

- [ ] Non-technical user can start server in <30 seconds
- [ ] Zero terminal commands required
- [ ] Credentials never exposed in git
- [ ] Chrome extension loads successfully
- [ ] Setup guide is understandable to product team
- [ ] Server starts without errors when credentials are valid

## Key Constraints

1. **macOS Only**: Script uses bash .command files (macOS-specific)
2. **Node.js Required**: Users must install Node.js manually if missing (one-time)
3. **Chrome Extension**: Cannot be automated due to Chrome security policies
4. **Shared Credentials**: Team uses same API keys (acceptable for MVP phase)

## Rollback Plan

If this approach doesn't work:
- Simple script has no side effects
- Can easily switch to Docker approach
- All code remains compatible (server.ts unchanged)

## Related Documents

- Implementation Plan: `C:\Users\pengh\.claude\plans\immutable-sleeping-waterfall.md`
- Project Roadmap: `ROADMAP.md`
- Development Guide: `CLAUDE.md`

---

**Next Steps**: Implement the files according to plan, test with product team member
