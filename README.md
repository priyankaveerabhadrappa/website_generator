# Application Generator

Generate personalized, animated job application websites from any job description. Instead of sending a PDF resume, send a live URL.

**Paste a job description. Get a website.**

## How It Works

1. Open the dashboard (`/dashboard`)
2. Paste a job description into the textarea
3. Click **Generate Application**
4. Wait ~15-30 seconds while Claude analyzes the job and your CV
5. Get a live URL (e.g., `/caidera`) to a fully personalized application site

Each generated site includes:

- **AI Candidate Review** -- job requirements matched against real CV evidence with scores
- **Experience Timeline** -- work history with highlights tailored to the specific role
- **Skills & Technologies** -- proficiency bars with job-relevant tags highlighted
- **Why This Company** -- 5-6 specific, non-generic motivation reasons
- **Education & Research** -- academic background and thesis details
- **How This Was Built** -- meta section showcasing the AI-assisted development workflow
- **Contact** -- email, LinkedIn, phone, languages, relocation info

All wrapped in a dark-themed, scroll-animated UI built with Framer Motion.

## Architecture

```mermaid
flowchart TB
    subgraph User Flow
        A["/dashboard"] -->|Paste job description| B["POST /api/generate"]
    end

    subgraph Generation Pipeline
        B --> C["Load candidate_cv.md"]
        B --> D["Load prompt template"]
        C & D --> E["Build prompt\n(JD + CV + template)"]
        E -->|API call| F["Claude Sonnet 4.6\n(AWS Bedrock)"]
        F -->|SiteConfig JSON| G{Validate & parse}
    end

    subgraph Storage
        G -->|Store| H[("Vercel Blob\n(production)")]
        G -.->|Fallback| I[("Filesystem\ndata/sites/*.json")]
    end

    subgraph Serving
        J["Visitor hits /company-name"] --> K["[slug]/page.tsx\n(Server Component)"]
        K -->|Fetch config| H
        K -.->|Fetch config| I
        K --> L["SiteRenderer\n(Client Component)"]
        L --> M["Navigation"]
        L --> N["HeroSection + ScoreRing"]
        L --> O["ReviewSection"]
        L --> P["ExperienceSection"]
        L --> Q["SkillsSection"]
        L --> R["WhyCompanySection"]
        L --> S["EducationSection"]
        L --> T["BuiltWithSection"]
        L --> U["ContactSection"]
    end

    subgraph Management
        V["GET /api/sites"] -->|List all| H
        W["DELETE /api/sites/slug"] -->|Remove| H
    end

    B -->|Return slug + URL| A

    style F fill:#6366f1,color:#fff
    style H fill:#10b981,color:#fff
    style L fill:#818cf8,color:#fff
```

**Stack:** Next.js 16, TypeScript, React 19, Tailwind CSS 4, Framer Motion, AWS Bedrock (Claude Sonnet), Vercel Blob

## Project Structure

```
src/
  app/
    page.tsx                  # Redirects to /dashboard
    dashboard/page.tsx        # Dashboard UI
    [slug]/page.tsx           # Dynamic route -- renders generated sites
    api/
      generate/route.ts       # POST -- calls LLM, stores config
      sites/route.ts          # GET -- lists all generated sites
      sites/[slug]/route.ts   # GET/DELETE -- single site operations
  components/
    dashboard/                # Dashboard UI components
    site/                     # Application site components (props-driven)
  lib/
    types.ts                  # SiteConfig interface
    llm.ts                    # AWS Bedrock integration
    prompt.ts                 # LLM prompt template
    storage.ts                # Vercel Blob + filesystem fallback
    candidate-cv.ts           # Loads candidate CV
data/
  candidate_cv.md             # Your full CV (edit this)
  sites/                      # Local dev storage (filesystem fallback)
```

## Setup

### Prerequisites

- Node.js 18+
- AWS account with Bedrock access (Claude Sonnet enabled in `eu-central-1`)
- Vercel account with a Blob store (for production)

### Local Development

```bash
# Install dependencies
npm install

# Create .env.local with your credentials
cp .env.example .env.local
# Edit .env.local with your AWS keys and optionally your Blob token

# Start dev server
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

Without `BLOB_READ_WRITE_TOKEN`, configs are saved to `data/sites/*.json` (filesystem fallback). With the token set, configs go to Vercel Blob and persist across restarts.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | Yes | AWS access key with Bedrock permissions |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS secret key |
| `AWS_REGION` | Yes | AWS region (e.g., `eu-central-1`) |
| `BLOB_READ_WRITE_TOKEN` | Production | Vercel Blob token (auto-provided when you link a Blob store) |

### Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add the four environment variables above in project settings
4. Link a Blob store: **Project Settings > Storage > Create Blob Store**
5. Deploy

Your dashboard will be at `your-app.vercel.app/dashboard`. Every generated site gets a URL like `your-app.vercel.app/company-name`.

## Customizing for Your Own CV

1. Edit `data/candidate_cv.md` with your full work history, education, and skills
2. Update the contact details in `src/lib/prompt.ts` (education, contact, and builtWith sections in the prompt template)
3. Redeploy

The LLM uses your CV as the source of truth -- it will never fabricate experiences or skills not present in the file.

## Built With

This entire project -- from architecture to implementation -- was built using [Claude Code](https://claude.ai/claude-code) as an AI pair programmer.
