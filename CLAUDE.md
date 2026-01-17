# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Token Usage Optimization

**Important:** Optimize for Claude Pro usage caps. Be efficient with tokens:

### Do
- Make targeted, surgical edits rather than rewriting large blocks
- Read only the files/sections you need (use line offsets for large files)
- Combine multiple small edits into fewer operations when possible
- Use concise responses - skip verbose explanations unless asked
- Batch related file reads in parallel
- Use `haiku` model for simple tasks via Task tool when appropriate

### Don't
- Re-read files you've already read in the same session
- Output entire files when only showing a small change
- Add lengthy explanations for straightforward changes
- Use the Explore agent for simple, targeted searches (use Grep/Glob directly)
- Make unnecessary tool calls - think before acting

### Response Style
- Be direct and concise
- Skip preamble like "I'll help you with..."
- Don't repeat back what the user asked
- Summarize changes briefly, don't enumerate every line

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Architecture

This is a React + TypeScript app built with Vite for organizing storage totes using AI-powered image analysis.

### Key Files

- `src/components/ToteOrganizer.tsx` - Main application component containing all UI and logic
- `src/lib/storage.ts` - localStorage wrapper with async API for data persistence

### Data Flow

1. User creates a tote by specifying a name and location
2. User uploads a photo of items to be stored
3. Claude API analyzes the image and extracts item descriptions and tags
4. Data is persisted to localStorage with `tote-organizer:` prefix

### API Integration

The app calls the Anthropic API directly from the browser for image analysis. Requires `VITE_ANTHROPIC_API_KEY` in `.env` file. Copy `.env.example` to `.env` and add your key.

**Note:** Direct browser API calls use the `anthropic-dangerous-direct-browser-access` header. For production, consider proxying through a backend.
