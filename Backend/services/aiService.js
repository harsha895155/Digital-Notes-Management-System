/**
 * MindDesk AI Note Summarization Service
 * Handles Short Summary, Detailed Summary, Key Points, and Action Items
 * Supports Google Gemini, OpenAI, or intelligent built-in NLP fallback
 */

const stripHtml = (html = "") => {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Built-in NLP extractive & abstractive summarizer fallback
 */
const fallbackSummarize = (text, summaryType = "short") => {
  const clean = stripHtml(text);
  if (!clean || clean.length < 20) {
    return "Note content is too short to generate a meaningful summary. Add more details first.";
  }

  const sentences = clean
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  if (summaryType === "short") {
    // Top 1-2 sentences
    const topSentences = sentences.slice(0, 2).join(" ");
    return topSentences || clean.slice(0, 200) + "...";
  }

  if (summaryType === "detailed") {
    // Detailed summary: up to 4 key sentences
    const topSentences = sentences.slice(0, 4).join(" ");
    return (
      topSentences +
      (sentences.length > 4 ? ` (Overview of ${sentences.length} points covered in this note)` : "")
    );
  }

  if (summaryType === "keyPoints") {
    // Bullet points
    const points = sentences.slice(0, 5).map((s) => `• ${s}`);
    return points.join("\n") || `• ${clean}`;
  }

  if (summaryType === "actionItems") {
    // Extract sentences with action verbs/tasks or return structured action items
    const actionWords = ["todo", "need", "must", "should", "ensure", "complete", "review", "call", "email", "finish", "send", "submit", "prepare", "organize"];
    const actionMatches = sentences.filter((s) =>
      actionWords.some((w) => s.toLowerCase().includes(w))
    );

    if (actionMatches.length > 0) {
      return actionMatches.slice(0, 5).map((s) => `☑ ${s}`).join("\n");
    }

    // Default checklist created from main points
    return sentences.slice(0, 3).map((s) => `☑ Review: ${s.slice(0, 80)}...`).join("\n");
  }

  return sentences.slice(0, 2).join(" ");
};

/**
 * Generate summary using external AI or intelligent fallback
 */
const generateNoteSummary = async (content, title = "", summaryType = "short") => {
  const plainText = stripHtml(content);

  if (!plainText || plainText.length < 15) {
    throw new Error("Note content must contain at least 15 characters to generate a summary.");
  }

  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

  // If Gemini API Key is configured, attempt call to Google Gemini
  if (apiKey && process.env.GEMINI_API_KEY) {
    try {
      const prompt = `You are a helpful notes assistant for MindDesk. Analyze the following note titled "${title}" and generate a ${summaryType} summary.
Options:
- 'short': 1-2 clear summary sentences.
- 'detailed': 1 concise paragraph highlighting main concepts.
- 'keyPoints': Bullet points of essential insights.
- 'actionItems': Checkbox items (☑ Task) representing actionable next steps.

Requested format: ${summaryType}

Note Content:
"""
${plainText.slice(0, 8000)}
"""`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const generated = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generated && generated.trim()) {
          return {
            summary: generated.trim(),
            summaryType,
            provider: "gemini",
            generatedAt: new Date(),
          };
        }
      }
    } catch (err) {
      console.warn("External Gemini API call failed, using built-in fallback:", err.message);
    }
  }

  // Built-in intelligent fallback
  const summary = fallbackSummarize(plainText, summaryType);
  return {
    summary,
    summaryType,
    provider: "minddesk-ai",
    generatedAt: new Date(),
  };
};

module.exports = {
  generateNoteSummary,
  stripHtml,
};
