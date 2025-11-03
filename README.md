# Kiln AI: Cement Plant Optimization Platform

Kiln AI is a full-stack web application designed to monitor, analyze, and optimize cement manufacturing processes using generative AI. It provides a real-time dashboard for plant operators and engineers to visualize key performance indicators (KPIs), receive automated alerts, and leverage AI-driven recommendations to improve efficiency and maintain quality.

## Features

- **Real-Time Dashboard**: A comprehensive interface displaying live metrics from the cement kiln, including temperature, feed rate, and raw mix composition.
- **AI-Powered Optimization**: Utilizes Google's Gemini model via the Genkit framework to generate actionable recommendations for optimizing operational setpoints, with a primary focus on the Lime Saturation Factor (LSF).
- **Automated Alerts**: An intelligent alert system that notifies operators of critical deviations from optimal ranges or potential equipment issues.
- **Plant "GPT"**: A conversational interface allowing operators to ask questions and get insights about the plant's current or historical data.
- **Historical Data Analysis**: (Future capability) A section to review and analyze historical performance data and past optimization recommendations.

## Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/), [Recharts](https://recharts.org/)
- **Backend/AI**: [Genkit (Google)](https://firebase.google.com/docs/genkit), [Google Gemini](https://deepmind.google/technologies/gemini/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: CSS Modules, PostCSS

## Getting Started

Follow these instructions to get a local copy of the project up and running for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/en) (v20.x or later)
- [npm](https://www.npmjs.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/kiln-ai-final.git
    cd kiln-ai-final
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Environment Variables

This project requires several environment variables to connect to the AI models and the database. Create a file named `.env.local` in the root of the project and add the following variables:

```env
# Google AI API Keys
GEMINI_API_KEY_ALERTS=your_google_ai_api_key
GEMINI_API_KEY_OPTIMIZER=your_google_ai_api_key
GEMINI_API_KEY_PLANTGPT=your_google_ai_api_key

# Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Running the Application

The application consists of two main parts: the Next.js frontend and the Genkit AI backend. You need to run both concurrently.

1.  **Start the Genkit server (in a separate terminal):**
    This server runs the AI flows and makes them available to the frontend. The `--watch` flag enables hot-reloading for the AI code.
    ```bash
    npm run genkit:watch
    ```
    The Genkit UI will be available at `http://localhost:4000`.

2.  **Start the Next.js development server (in another terminal):**
    ```bash
    npm run dev
    ```
    The web application will be available at `http://localhost:9003`.

## Project Structure

-   `.`
-   `├── src`
-   `│   ├── ai`: Contains all Genkit-related code.
-   `│   │   ├── flows`: Defines the core AI logic and prompts for different tasks (e.g., optimization, alerts).
-   `│   │   └── tools`: (If any) Custom tools that can be used by the Genkit flows.
-   `│   ├── app`: The Next.js 14+ application directory with page-based routing.
-   `│   ├── components`: Reusable React components, organized by feature (dashboard, layout, etc.) and the `ui` library from Shadcn.
-   `│   ├── context`: React context providers for managing global state (e.g., live data).
-   `│   ├── hooks`: Custom React hooks.
-   `│   └── lib`: Utility functions, Supabase client configuration, and data formatting logic.
-   `├── package.json`: Lists project dependencies and scripts.
-   `└── next.config.ts`: Next.js configuration file.

## AI Integration

The core AI functionality is built using **Genkit**.

-   **`src/ai/genkit.ts`**: This file initializes and configures the Genkit plugins, including the `googleAI` plugin to connect to the Gemini models. It sets up separate AI instances (`alertsAI`, `optimizerAI`, `plantGPTAI`) which could potentially use different models or configurations.

-   **`src/ai/flows/optimize-cement-production.ts`**: This is a server-side function that defines the main optimization logic. It constructs a detailed prompt for the Gemini model, including:
    -   The AI's persona (an expert AI process engineer).
    -   Real-time data from the plant.
    -   Operational constraints.
    -   A structured output format using Zod schemas (`AIGenerationSchema`).

This flow takes the current plant state as input and returns a JSON object with recommended setpoints and a clear explanation for the changes.
