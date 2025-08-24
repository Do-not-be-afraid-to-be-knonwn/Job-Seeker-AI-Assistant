# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Scripts
```bash
# Run extraction chains (default: skills)
npm start                    # ts-node src/scripts/runExtractSkills.ts
npm run dev                  # Watch mode for skills extraction

# Testing
npm test                     # Run Jest test suite
npm run smoke                # Run smoke tests with real job data
npm run smoke:local          # Run local smoke tests only

# Performance & Metrics
npm run export-metrics       # Export performance metrics to CSV

# Server
npx ts-node server.ts        # Start API server on port 3000
```

### Environment Setup
Required `.env` file with:
```
GEMINI_API_KEY=your_api_key_here
GEMINI_PRIMARY_MODEL=gemini-2.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
```

## Architecture Overview

### Core System Design
This is an AI-powered job analysis system that extracts structured information from job postings using LangChain and Gemini models. The system follows a **chain-based architecture** with four main extraction capabilities:

1. **Skills Extraction** - Technical skills, frameworks, tools
2. **Domain Classification** - Backend, Frontend, Full Stack, Mobile, DevOps, etc.
3. **Level Detection** - Intern, Entry, Junior, Mid, Senior, Lead, Manager, etc.
4. **Years of Experience** - Required experience from job descriptions

### Key Architectural Components

#### LLM Client System (`src/llm/clients.ts`)
- **Dual LLM Architecture**: Primary model (gemini-2.5-flash-lite) with fallback (gemini-2.5-flash)
- **Built-in Retry Logic**: 3 attempts with primary, then fallback
- **Monitoring Integration**: Automatic performance tracking via ChainPerformanceMonitor
- **Schema Validation**: Zod-based output validation with JSON extraction from markdown

#### Chain Pattern (`src/chains/`)
Each extraction chain follows the same pattern:
```typescript
export async function makeExtractXChain() {
  const prompt = await makeExtractXPrompt();
  return makeChain(prompt, XSchema, "extractX", skipValidation);
}
```

#### Performance Monitoring (`src/monitor/`)
- **ChainPerformanceMonitor**: Singleton tracking response times, token usage, success rates
- **CSV Export**: Automatic performance logging to `chain-performance.csv`
- **Test Validation**: Tracks accuracy when run with expected results
- **Validator System**: Flexible validation with partial string matching for skills

#### API Server (`server.ts`)
Express server with two endpoints:
- `POST /extract-all` - Runs all four extraction chains in parallel
- `POST /feedback` - Collects user feedback to `feedback.jsonl`

### Data Flow
```
Job Text → Prompt Template → LLM (Primary/Fallback) → JSON Parse → Schema Validation → Result
                                     ↓
                            Performance Monitor → CSV Export
```

## Key Implementation Details

### Schema Definitions (`src/schemas/`)
- All schemas use Zod for runtime validation
- Skills schema: `{ skills: string[] }`
- Domain schema: Enum of predefined technical domains
- Level schema: Enum from Intern to Executive
- Years schema: `{ years: number }`

### Prompt Engineering (`src/prompts/`)
- Few-shot learning examples for accuracy
- Domain-specific prompts optimized for job posting text
- Clear instructions for JSON output format

### Test System (`test/`)
- **Smoke Tests**: Real job posting validation in `test/smoke/smoke.json`
- **E2E Tests**: Server endpoint testing
- **Chrome Extension Tests**: Browser automation testing
- **Jest Configuration**: TypeScript with Node environment

## Development Patterns

### Adding New Extraction Chains
1. Create prompt template in `src/prompts/`
2. Define Zod schema in `src/schemas/`
3. Implement chain in `src/chains/` following existing pattern
4. Add script in `src/scripts/` for standalone testing
5. Update `server.ts` to include in `/extract-all` endpoint

### Testing New Features
1. Add test cases to `test/smoke/smoke.json`
2. Run `npm run smoke:local` for validation
3. Monitor performance with `npm run export-metrics`

### Chrome Extension Integration
The project includes a Chrome extension template in `src/chrome-extension-template/` for real-time job analysis on platforms like LinkedIn and Indeed.

## Current Status
- **Development Phase**: Core extraction chains implemented and tested
- **Performance Optimized**: Dual LLM architecture with monitoring
- **Future Directions**: Job matching engine, data import pipeline, web dashboard