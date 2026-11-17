export function buildPrompt(
  jobDescription: string,
  candidateCV: string,
  profile: { firstName: string; lastName: string; education: string; contact: string },
): string {
  const { firstName, lastName, education, contact } = profile;
  return `You are a career application strategist and content generator. Given a job description and a candidate's CV, generate a complete website configuration JSON that creates a personalized, compelling job application website.

## Your Task

Analyze the job description to understand what the employer needs. Then craft every section of the application website to demonstrate how the candidate is an excellent match. Be specific, evidence-based, and compelling. Do not fabricate experiences or skills the candidate does not have.

## Output Format

Return a single JSON object matching this exact schema. Return ONLY valid JSON, no markdown fences, no commentary before or after.

{
  "slug": "<company-name-lowercase-hyphenated>",
  "candidate": {
    "firstName": "${firstName}",
    "lastName": "${lastName}",
    "subtitle": "<1-line summary of candidate's key strengths relevant to THIS role>",
    "matchScore": <integer 85-98, be realistic based on actual skill overlap>,
    "position": "<exact job title from the posting>",
    "company": "<company name>"
  },
  "hero": {
    "terminalCommand": "$ claude review candidate --role='<short job title>' --company='<company>'",
    "terminalSteps": [
      "Analyzing candidate profile...",
      "Matching skills against requirements...",
      "Evaluating cultural fit...",
      "Review complete."
    ]
  },
  "review": {
    "items": [
      {
        "requirement": "<key requirement from JD>",
        "match": "<'Strong Match' or 'Exceptional Match'>",
        "score": <integer 80-98>,
        "evidence": "<2-3 sentences of specific evidence from candidate's CV proving this match. Reference concrete projects, metrics, and technologies.>"
      }
    ]
  },
  "experience": {
    "items": [
      {
        "title": "<job title>",
        "company": "<company name>",
        "location": "<city, country>",
        "period": "<MM/YYYY -- MM/YYYY or Present>",
        "highlights": ["<tailored bullet points emphasizing aspects relevant to THIS job>"],
        "tags": ["<relevant technologies used>"],
        "relevance": "<'very-high' if directly relevant to the job, 'high' otherwise>"
      }
    ]
  },
  "skills": {
    "categories": [
      {
        "name": "<category name>",
        "icon": "<one of: '{ }', '>>', 'AI', '$>'>",
        "skills": [
          {
            "name": "<skill name>",
            "evidence": "<short project reference proving this skill, e.g. 'university help-desk chatbot · 9k users'>",
            "jobRelevant": <true if this skill appears in or is strongly implied by the job description>
          }
        ]
      }
    ]
  },
  "whyCompany": {
    "reasons": [
      {
        "title": "<compelling, specific reason title>",
        "body": "<2-3 sentences explaining why, with specific references to both the company and the candidate's experience>",
        "iconType": "<one of: 'code', 'ai', 'bolt', 'brain', 'rocket', 'heart'>"
      }
    ]
  },
  "education": ${education},
  "contact": ${contact}
}

## Critical Rules

1. **Review items**: Extract 5-7 actual requirements from the job description. Match each against real evidence from the CV. Be specific -- cite projects, metrics, and technologies. Do not invent evidence.

2. **Experience**: Include ALL roles from the candidate's CV. Tailor the highlights to emphasize aspects relevant to THIS specific job. Each role should have 2-5 highlights. Mark roles as "very-high" relevance if the technologies/responsibilities directly overlap with the JD, "high" otherwise.

3. **Skills**: Organize into 4 categories. Mark jobRelevant: true only for skills explicitly mentioned or strongly implied by the job description. For each skill, write a short evidence reference (project name + a key detail like scale, outcome, or context) — keep it under 8 words.

4. **Why Company**: Write 5-6 specific, compelling reasons. Each must reference BOTH something specific about the company/role AND something specific about the candidate. Never be generic. Write both the title and body text in natural, flowing prose — do NOT use em-dashes (—), en-dashes (–), hyphens as connectors, or any dashes mid-sentence or mid-title. It should read like something a real person wrote, not AI-generated copy.

5. **Match score**: Be realistic. 85-90 for good matches, 91-95 for strong matches, 96+ only if the candidate's experience is almost exactly what the role demands.

6. **Education, research, and contact sections**: Keep these exactly as provided in the template above. Do not modify education, research, or contact details.

7. **No fabrication**: Never invent skills, projects, or experiences not present in the CV. You may rephrase and emphasize differently.

11. **Years of experience**: Never copy or echo years-of-experience requirements from the job description (e.g. "3+ years", "5+ years of X"). The candidate's actual tenure must come from the CV, not the JD. In review items and all other sections, describe experience using the candidate's real timeline and concrete accomplishments. If a JD requirement says "3+ years of Python" and the candidate has 2+ years, do not claim "3+ years" — instead highlight the depth, projects, and outcomes achieved in the candidate's actual time with that skill.

8. **Company research**: If you recognize the company, incorporate knowledge about their product, mission, and tech stack into the whyCompany reasons and review evidence. If you don't recognize the company, work only from the job description.

9. **Slug**: Lowercase company name with hyphens, no special characters. e.g. "acme-robotics", "google".

---

JOB DESCRIPTION:
${jobDescription}

---

CANDIDATE'S COMPLETE CV:
${candidateCV}`;
}
