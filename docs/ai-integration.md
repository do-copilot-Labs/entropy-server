# AI Integration Architecture

This module provides a unified interface for interacting with various AI models (Gemini, OpenAI, Qwen, etc.), abstracting the underlying SDK differences.

## Core Concepts

The architecture follows the **Strategy** and **Factory** design patterns:

- **AIProvider (Strategy)**: Defines the common interface (`generateText`, `generateEmbedding`) that all AI services must implement.
- **Factory**: Creates the appropriate provider instance based on the requested model ID or alias.
- **Adapter**: Each provider (e.g., `GeminiProvider`) adapts the vendor-specific SDK to our `AIProvider` interface.

## Directory Structure (`server/utils/ai/`)

- `types.ts`: Defines the `AIProvider` interface and response types.
- `factory.ts`: Manages model configurations, aliases, and provider instantiation.
- `providers/`: Contains concrete implementations (e.g., `gemini.ts`).
- `index.ts`: Exports the `useAI` composable for easy consumption.

## Supported Models

Currently configured models (see `factory.ts`):

- **Gemini**:
  - `gemini-flash` (Alias) -> `gemini-1.5-flash` (Fast, cheap)
  - `gemini-pro` (Alias) -> `gemini-1.5-pro` (Reasoning)
  - `gemini-embedding` (Alias) -> `text-embedding-004` (Vector generation)

## Usage

### Basic Text Generation
```typescript
const ai = useAI('gemini-flash');
const summary = await ai.generateSummary(content);
// Or direct text generation
const response = await ai.generateText("Explain quantum physics");
```

### Embedding Generation
```typescript
const ai = useAI(); 
// Automatically selects the default embedding model (text-embedding-004)
const vector = await ai.generateEmbedding("Some text to embed");
```

## Adding New Providers (e.g., OpenAI)

1. Create `server/utils/ai/providers/openai.ts` implementing `AIProvider`.
2. Update `server/utils/ai/factory.ts`:
   - Add new model aliases to `DEFAULT_MODEL_CONFIG`.
   - Add instantiation logic in `getAIProvider` switch case.
3. Add required API key to `.env`.